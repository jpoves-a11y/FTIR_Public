const TRIAL_CONFIG = {
  maxMovements: 10,
  fingerprintSalt: 'FTIR_GBM_2025_SECURE',
  rateLimitMs: 1000
};

async function hashFingerprint(fingerprint, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 
         'unknown';
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

async function checkRateLimit(env, clientIP) {
  const rateLimitKey = `ratelimit:${clientIP}`;
  const lastRequest = await env.TRIAL_KV.get(rateLimitKey);
  const now = Date.now();
  
  if (lastRequest) {
    const timeSince = now - parseInt(lastRequest, 10);
    if (timeSince < TRIAL_CONFIG.rateLimitMs) {
      return { allowed: false, retryAfter: TRIAL_CONFIG.rateLimitMs - timeSince };
    }
  }
  
  await env.TRIAL_KV.put(rateLimitKey, now.toString(), {
    expirationTtl: 60
  });
  
  return { allowed: true };
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (!env.TRIAL_KV) {
    console.error('TRIAL_KV binding not configured');
    return new Response(
      JSON.stringify({ 
        error: 'KV_NOT_CONFIGURED', 
        message: 'Server storage not configured',
        remaining: TRIAL_CONFIG.maxMovements,
        fallback: true,
        serverConfigured: false
      }),
      { status: 503, headers: corsHeaders(origin) }
    );
  }

  const clientIP = getClientIP(request);
  
  if (clientIP === 'unknown') {
    return new Response(
      JSON.stringify({ error: 'Could not identify client' }),
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  try {
    if (request.method === 'POST') {
      const body = await request.json();
      const { action, hardwareFingerprint, fingerprint } = body;
      let { cost = 1 } = body;

      const hwFp = hardwareFingerprint || fingerprint || 'default';

      cost = parseInt(cost, 10);
      if (isNaN(cost) || cost < 1 || cost > 10) {
        cost = 1;
      }

      if (action === 'use') {
        const rateLimit = await checkRateLimit(env, clientIP);
        if (!rateLimit.allowed) {
          return new Response(
            JSON.stringify({ 
              error: 'Rate limited', 
              retryAfter: rateLimit.retryAfter 
            }),
            { status: 429, headers: corsHeaders(origin) }
          );
        }
      }
      
      const ipKey = await hashFingerprint(`ip:${clientIP}`, TRIAL_CONFIG.fingerprintSalt);
      const ipStorageKey = `trial:ip:${ipKey}`;
      
      const hwKey = await hashFingerprint(`hw:${hwFp}`, TRIAL_CONFIG.fingerprintSalt);
      const hwStorageKey = `trial:hw:${hwKey}`;

      if (action === 'check') {
        const [ipRecord, hwRecord] = await Promise.all([
          env.TRIAL_KV.get(ipStorageKey, { type: 'json' }),
          env.TRIAL_KV.get(hwStorageKey, { type: 'json' })
        ]);
        
        let effectiveRemaining = TRIAL_CONFIG.maxMovements;
        let isNew = true;
        
        if (ipRecord) {
          effectiveRemaining = Math.min(effectiveRemaining, ipRecord.remaining);
          isNew = false;
        }
        if (hwRecord) {
          effectiveRemaining = Math.min(effectiveRemaining, hwRecord.remaining);
          isNew = false;
        }
        
        const now = Date.now();
        const recordData = {
          remaining: effectiveRemaining,
          created: ipRecord?.created || hwRecord?.created || now,
          lastAccess: now,
          usageCount: Math.max(ipRecord?.usageCount || 0, hwRecord?.usageCount || 0),
          clientIP: clientIP,
          hwFp: hwFp.substring(0, 16)
        };
        
        await Promise.all([
          env.TRIAL_KV.put(ipStorageKey, JSON.stringify(recordData), {
            expirationTtl: 60 * 60 * 24 * 365
          }),
          env.TRIAL_KV.put(hwStorageKey, JSON.stringify(recordData), {
            expirationTtl: 60 * 60 * 24 * 365
          })
        ]);

        return new Response(
          JSON.stringify({ remaining: effectiveRemaining, isNew: isNew }),
          { headers: corsHeaders(origin) }
        );
      }

      if (action === 'use') {
        const [ipRecord, hwRecord] = await Promise.all([
          env.TRIAL_KV.get(ipStorageKey, { type: 'json' }),
          env.TRIAL_KV.get(hwStorageKey, { type: 'json' })
        ]);
        
        let effectiveRemaining = TRIAL_CONFIG.maxMovements;
        
        if (ipRecord) {
          effectiveRemaining = Math.min(effectiveRemaining, ipRecord.remaining);
        }
        if (hwRecord) {
          effectiveRemaining = Math.min(effectiveRemaining, hwRecord.remaining);
        }

        if (effectiveRemaining < cost) {
          return new Response(
            JSON.stringify({ 
              error: 'Trial exhausted', 
              remaining: effectiveRemaining,
              exhausted: true 
            }),
            { headers: corsHeaders(origin) }
          );
        }

        const newRemaining = effectiveRemaining - cost;
        const now = Date.now();
        
        const recordData = {
          remaining: newRemaining,
          created: ipRecord?.created || hwRecord?.created || now,
          lastAccess: now,
          usageCount: (Math.max(ipRecord?.usageCount || 0, hwRecord?.usageCount || 0)) + 1,
          clientIP: clientIP,
          hwFp: hwFp.substring(0, 16)
        };

        await Promise.all([
          env.TRIAL_KV.put(ipStorageKey, JSON.stringify(recordData), {
            expirationTtl: 60 * 60 * 24 * 365
          }),
          env.TRIAL_KV.put(hwStorageKey, JSON.stringify(recordData), {
            expirationTtl: 60 * 60 * 24 * 365
          })
        ]);

        return new Response(
          JSON.stringify({ 
            remaining: newRemaining, 
            used: cost,
            exhausted: newRemaining <= 0 
          }),
          { headers: corsHeaders(origin) }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders(origin) }
    );

  } catch (error) {
    console.error('Trial API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Server error', 
        remaining: TRIAL_CONFIG.maxMovements,
        fallback: true 
      }),
      { status: 200, headers: corsHeaders(origin) }
    );
  }
}
