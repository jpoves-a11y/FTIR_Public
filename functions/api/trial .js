const TRIAL_CONFIG = {
  maxMovements: 10,
  fingerprintSalt: 'FTIR_GBM_2025_SECURE'
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

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (!env.TRIAL_KV) {
    console.error('TRIAL_KV binding not configured - trial system running in fallback mode');
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

  try {
    if (request.method === 'POST') {
      const body = await request.json();
      const { action, fingerprint } = body;
      let { cost = 1 } = body;

      if (!fingerprint) {
        return new Response(
          JSON.stringify({ error: 'Fingerprint required' }),
          { status: 400, headers: corsHeaders(origin) }
        );
      }

      cost = parseInt(cost, 10);
      if (isNaN(cost) || cost < 1 || cost > 10) {
        cost = 1;
      }

      const clientIP = getClientIP(request);
      const combinedFP = `${fingerprint}:${clientIP}`;
      const hashedKey = await hashFingerprint(combinedFP, TRIAL_CONFIG.fingerprintSalt);
      const storageKey = `trial:${hashedKey}`;

      if (action === 'check') {
        const stored = await env.TRIAL_KV.get(storageKey, { type: 'json' });
        
        if (!stored) {
          const newData = {
            remaining: TRIAL_CONFIG.maxMovements,
            created: Date.now(),
            lastAccess: Date.now(),
            usageCount: 0
          };
          await env.TRIAL_KV.put(storageKey, JSON.stringify(newData), {
            expirationTtl: 60 * 60 * 24 * 365
          });
          return new Response(
            JSON.stringify({ remaining: newData.remaining, isNew: true }),
            { headers: corsHeaders(origin) }
          );
        }

        stored.lastAccess = Date.now();
        await env.TRIAL_KV.put(storageKey, JSON.stringify(stored), {
          expirationTtl: 60 * 60 * 24 * 365
        });

        return new Response(
          JSON.stringify({ remaining: stored.remaining, isNew: false }),
          { headers: corsHeaders(origin) }
        );
      }

      if (action === 'use') {
        let stored = await env.TRIAL_KV.get(storageKey, { type: 'json' });
        
        if (!stored) {
          stored = {
            remaining: TRIAL_CONFIG.maxMovements,
            created: Date.now(),
            lastAccess: Date.now(),
            usageCount: 0
          };
        }

        if (stored.remaining < cost) {
          return new Response(
            JSON.stringify({ 
              error: 'Trial exhausted', 
              remaining: stored.remaining,
              exhausted: true 
            }),
            { headers: corsHeaders(origin) }
          );
        }

        stored.remaining -= cost;
        stored.lastAccess = Date.now();
        stored.usageCount += 1;

        await env.TRIAL_KV.put(storageKey, JSON.stringify(stored), {
          expirationTtl: 60 * 60 * 24 * 365
        });

        return new Response(
          JSON.stringify({ 
            remaining: stored.remaining, 
            used: cost,
            exhausted: stored.remaining <= 0 
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
