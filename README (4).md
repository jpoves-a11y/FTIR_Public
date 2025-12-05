# FTIR UHMWPE Analyzer

A comprehensive web-based tool for analyzing Fourier-Transform Infrared (FTIR) spectroscopy data of Ultra-High Molecular Weight Polyethylene (UHMWPE) samples. This application provides advanced spectroscopic analysis capabilities for material scientists and researchers studying biomedical polymer degradation.

![FTIR UHMWPE Analyzer](logo-gbm.png)

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [File Formats](#file-formats)
4. [Application Structure](#application-structure)
5. [Analysis Modules](#analysis-modules)
   - [Spectrum Visualization](#spectrum-visualization)
   - [Offset Correction](#offset-correction)
   - [Oxidation Analysis](#oxidation-analysis)
   - [Crystallinity Analysis](#crystallinity-analysis)
   - [Trans-Vinylene Index (TVI)](#trans-vinylene-index-tvi)
   - [Vitamin E Analysis](#vitamin-e-analysis)
   - [Carbonyl Deconvolution](#carbonyl-deconvolution)
   - [Multiple Deconvolution](#multiple-deconvolution)
   - [Synovial Liquid Analysis](#synovial-liquid-analysis)
   - [Comparative Analysis](#comparative-analysis)
   - [Ketone Frequency Shift](#ketone-frequency-shift)
6. [Technical Implementation](#technical-implementation)
7. [Export Capabilities](#export-capabilities)
8. [Dependencies](#dependencies)
9. [Usage](#usage)
10. [Contact](#contact)

---

## Overview

The FTIR UHMWPE Analyzer is designed for the quantitative analysis of oxidative degradation and structural changes in UHMWPE materials commonly used in orthopedic implants. The application processes FTIR spectral data to calculate various indices and concentrations of degradation products.

### Key Capabilities

- Multi-depth spectral analysis (surface to bulk profiling)
- Automatic baseline correction algorithms
- Advanced peak deconvolution using optimization techniques
- Quantification of carbonyl species concentrations
- Comparative pre/post-extraction analysis
- Professional report generation (PDF and Excel)

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-format Support** | CSV, TXT, Excel, DPT, SPC, OPUS formats |
| **Multi-depth Analysis** | Process multiple depths from a single file or multiple files |
| **Automatic Processing** | One-click full analysis with automatic baseline correction |
| **Peak Deconvolution** | Advanced curve fitting with Lorentzian-Gaussian profiles |
| **Species Quantification** | Concentration calculations using Beer-Lambert law |
| **Comparative Analysis** | Pre/post extraction comparison for adsorbed species |
| **Data Export** | PDF reports with charts and Excel spreadsheets |

---

## File Formats

### Supported Input Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| CSV | `.csv` | Comma-separated values with wavenumber and transmittance columns |
| Text | `.txt` | Tab or space-delimited text files |
| Excel | `.xlsx`, `.xls` | Microsoft Excel workbooks with spectral data |
| DPT | `.dpt` | OPUS data point table format |
| SPC | `.spc` | Thermo Galactic spectral format |
| OPUS | `.0` | Bruker OPUS binary format |

### Multi-Depth File Naming Convention

For multiple DPT files representing different depths:
```
SAMPLE_01.dpt  → 0 µm (surface)
SAMPLE_02.dpt  → 200 µm
SAMPLE_03.dpt  → 400 µm
...
```

The depth increment can be configured (default: 200 µm).

### Multi-Column DPT Files

Single DPT files containing multiple depth columns are automatically detected and parsed.

---

## Application Structure

```
FTIR-UHMWPE-Analyzer/
├── index.html          # Main application (HTML, CSS, JavaScript)
├── server.py           # Python HTTP server for local hosting
├── logo-gbm.png        # Application logo
├── favicon.png         # Browser favicon
├── README.md           # This documentation
└── replit.md           # Project configuration
```

### Architecture

The application is a single-page static web application with no build process required. All functionality is contained within `index.html`, which includes:

- **HTML Structure**: Tab-based interface with multiple analysis modules
- **CSS Styling**: Modern responsive design with Bootstrap 5
- **JavaScript Logic**: Complete analysis algorithms and visualization code

---

## Analysis Modules

### Spectrum Visualization

The main visualization panel displays all loaded spectra with:

- **Inverted X-axis**: Wavenumber displayed high-to-low (spectroscopic convention)
- **Color-coded depths**: Consistent color assignment across all analysis tabs
- **Interactive plots**: Zoom, pan, and hover for detailed inspection
- **Multi-depth overlay**: All depths displayed simultaneously for comparison

**How it works internally:**
1. Spectra are stored in `window.AppState.spectraData` object
2. Each depth is assigned a unique color using HSL color space
3. Plotly.js renders interactive charts with configurable axes

---

### Offset Correction

Corrects baseline offset by normalizing spectra to a reference point.

**Algorithm:**
1. Identifies the minimum absorbance value in a reference region
2. Calculates offset for each spectrum relative to surface (0 µm)
3. Applies vertical shift to align all spectra

**Reference Regions:**
- Primary: 1980-2100 cm⁻¹ (PE asymmetric stretch)
- Alternative: 1330-1400 cm⁻¹ (CH₂ wagging)

**Implementation:**
```javascript
function applyOffsetCorrection() {
    // Find reference region minimum for surface spectrum
    const surfaceRef = findMinimumInRegion(surfaceSpectrum, 1980, 2100);
    
    // Calculate and apply offset for each depth
    for (depth in spectraData) {
        const depthRef = findMinimumInRegion(spectraData[depth], 1980, 2100);
        const offset = surfaceRef - depthRef;
        spectraData[depth].transmittance = applyOffset(transmittance, offset);
    }
}
```

---

### Oxidation Analysis

Calculates the Oxidation Index (OI) measuring carbonyl content relative to polyethylene backbone.

**Formula:**
```
OI = Area(C=O peak) / Area(Reference peak)
```

**Spectral Regions:**
- Interest Peak: 1680-1850 cm⁻¹ (carbonyl stretch)
- Reference Peak: 1330-1400 cm⁻¹ (CH₂ wagging)

**Process:**
1. Apply automatic baseline correction to both regions
2. Calculate peak areas using Simpson's rule integration
3. Compute ratio of interest to reference area

**Baseline Correction Method:**
- Identifies minimum points at region edges (first/last 20%)
- Creates linear baseline between these points
- Subtracts baseline from spectrum

---

### Crystallinity Analysis

Calculates the Crystallinity Index (CI) measuring the ratio of crystalline to amorphous polyethylene content.

**Formula (mpint standard):**
```
CA = Area(PE crystalline) / Area(PE amorphous)
CI = CA / (CA + 1)
```

**Spectral Regions:**
- Crystalline Peak: 1850-1950 cm⁻¹ (CH₂ bending, crystalline)
- Amorphous Peak: 1275-1330 cm⁻¹ (CH₂ twisting, amorphous)

**Implementation:**
```javascript
function calculateCrystallinityIndex(interestArea, referenceArea) {
    if (referenceArea === 0) return 0;
    const CA = interestArea / referenceArea;  // Crystalline/Amorphous ratio
    const CI = CA / (CA + 1);  // Crystallinity index
    return CI < 0 ? -0.0001 : CI;  // Protect against negative values
}
```

---

### Trans-Vinylene Index (TVI)

Measures trans-vinylene unsaturation, an indicator of radiation crosslinking.

**Formula:**
```
TVI = Area(C=C peak) / Area(Reference peak)
```

**Spectral Regions:**
- Interest Peak: 950-980 cm⁻¹ (trans-vinylene C=C)
- Reference Peak: 1330-1400 cm⁻¹ (CH₂ wagging)

---

### Vitamin E Analysis

Quantifies α-tocopherol (Vitamin E) content in stabilized UHMWPE.

**Formula:**
```
Vitamin E Index = Area(Vitamin E peak) / Area(Reference peak)
```

**Spectral Regions:**
- Interest Peak: 1190-1230 cm⁻¹ (centered at 1210 cm⁻¹)
- Reference Peak: 1330-1400 cm⁻¹

---

### Carbonyl Deconvolution

Advanced peak fitting to separate overlapping carbonyl species in the 1650-1800 cm⁻¹ region.

#### Carbonyl Species Identified

| Species | Frequency (cm⁻¹) | ε (L·mol⁻¹·cm⁻¹) | Band Width |
|---------|------------------|-------------------|------------|
| Lactones | 1775 | 8110 | 15 cm⁻¹ |
| Esters/Aldehydes | 1735 | 8110 | 18 cm⁻¹ |
| Ketones | 1721 | 6880 | 15 cm⁻¹ |
| Carboxylic Acids | 1715 | 16800 | 18 cm⁻¹ |
| γ-Ketoacids | 1755 (keto), 1705 (acid) | 6880/16800 | 12/15 cm⁻¹ |

#### Peak Shape Model

Mixed Gaussian-Lorentzian profile (Voigt approximation):

```javascript
function calculateMixedGaussianLorentzianValue(x, center, intensity, width, lorentzianFraction) {
    const sigma = width / (2 * Math.sqrt(2 * Math.log(2)));
    const gamma = width / 2;
    
    // Gaussian component
    const gaussian = intensity * Math.exp(-Math.pow(x - center, 2) / (2 * sigma * sigma));
    
    // Lorentzian component
    const lorentzian = intensity * (gamma * gamma) / 
                       (Math.pow(x - center, 2) + gamma * gamma);
    
    // Mixed profile
    return lorentzianFraction * lorentzian + (1 - lorentzianFraction) * gaussian;
}
```

#### Optimization Algorithm

**Adam Optimizer** with multi-start approach:

1. **Parameters Optimized:**
   - Peak intensity
   - Peak width (±3 cm⁻¹ from initial)
   - Peak frequency (±2 cm⁻¹ from initial)
   - Lorentzian fraction (species-specific limits)

2. **Convergence Criteria:**
   - R² > 0.9995 AND R²-Abs > 0.99
   - Or no improvement for 500 iterations
   - Maximum 5000 iterations per run

3. **Multi-Start Strategy:**
   - 3 optimization runs with different initial conditions
   - Best result selected based on R² and area error

**Adam Update Rule:**
```javascript
m = β₁ * m + (1 - β₁) * gradient
v = β₂ * v + (1 - β₂) * gradient²
m_hat = m / (1 - β₁^t)
v_hat = v / (1 - β₂^t)
param = param - learningRate * m_hat / (√v_hat + ε)
```

Default hyperparameters: β₁=0.9, β₂=0.999, ε=10⁻⁸, learning rate=0.05

---

### Multiple Deconvolution

Batch processing of deconvolution across all depths.

**Process:**
1. Iterates through all loaded depths
2. Calls individual deconvolution for each depth
3. Aggregates results for concentration profiles
4. Generates depth vs. concentration plots

**Implementation:**
```javascript
async function runMultipleDeconvolution() {
    for (depth of depths) {
        // Set depth selector
        depthSelect.value = depth;
        
        // Run individual deconvolution (same pipeline)
        await performDeconvolution();
        
        // Extract and store results
        const simpsonAreas = calculateSpeciesAreasWithSimpson();
        const referenceBandArea = calculateReferenceBandArea();
        
        // Calculate concentrations
        for (species of carbonylSpecies) {
            concentration = (area / (epsilon * referenceBandArea)) * 1000;
        }
    }
}
```

---

### Synovial Liquid Analysis

Quantifies adsorbed species from synovial fluid on explanted UHMWPE components.

#### Species Analyzed

| Species | Frequency (cm⁻¹) | ε (L·mol⁻¹·cm⁻¹) |
|---------|------------------|-------------------|
| Lactones | 1775 | 8110 |
| Esters | 1735 | 8110 |
| Aldehydes | 1735 | 8110 |
| Carboxylic Acids | 1715 | 16800 |
| Ketones | 1721 | 6880 |

#### Concentration Calculation

Using Beer-Lambert Law:
```
C = A / (ε × b)
```

Where:
- C = Concentration (mol/cm³)
- A = Integrated absorbance (peak area)
- ε = Molar extinction coefficient
- b = Path length (reference band area as normalization)

**Output:** Concentrations in mmol/cm³

---

### Comparative Analysis

Compares pre-extraction and post-extraction spectra to quantify adsorbed species.

**Workflow:**
1. Load pre-extraction data (contains adsorbed + polymer signals)
2. Load post-extraction data (polymer-only after solvent extraction)
3. Automatic depth matching between datasets
4. Calculate concentration differences: ΔC = C(pre) - C(post)

**Depth Matching Algorithm:**
```javascript
function findMatchingDepths(preDepths, postDepths) {
    const matches = [];
    for (preDepth of preDepths) {
        const preValue = parseFloat(preDepth.replace(/[^\d.]/g, ''));
        for (postDepth of postDepths) {
            const postValue = parseFloat(postDepth.replace(/[^\d.]/g, ''));
            if (Math.abs(preValue - postValue) < 1) {  // Within 1 µm tolerance
                matches.push({pre: preDepth, post: postDepth, depth: preValue});
            }
        }
    }
    return matches;
}
```

**Visualization:**
- Line plots showing concentration vs. depth for each species
- Difference plots (ΔConcentration vs. depth)
- Data tables with all numerical values

---

### Ketone Frequency Shift

Analyzes the shift of ketone peak frequency across depths.

**Reference Frequency:** 1721 cm⁻¹ (literature value for ketones in UHMWPE)

**Analysis:**
1. Extract optimized ketone frequency from each depth's deconvolution
2. Calculate shift: Δν = ν(observed) - 1721 cm⁻¹
3. Plot frequency vs. depth profile
4. Generate data table with all values

**Significance:**
- Frequency shifts mainly indicate ketones position along polyethylene chains, being lower frequencies when more internal they are, and higher frequencies when nearer to the chain extreme they are
- Hydrogen bonding typically causes red shift (lower frequency)
- Can indicate interaction with adsorbed species

---

## Technical Implementation

### Area Calculation

**Simpson's Rule Integration** (1/3 rule):

```javascript
function calculateAreaSimpsonRule(frequency, transmittance) {
    // Formula: (h/3) * [f(x₀) + 4*f(x₁) + 2*f(x₂) + 4*f(x₃) + ... + f(xₙ)]
    
    let area = 0;
    for (let i = 0; i < n - 1; i += 2) {
        const h = (frequency[i+2] - frequency[i]) / 2;
        area += (h / 3) * (transmittance[i] + 4*transmittance[i+1] + transmittance[i+2]);
    }
    return area;
}
```

Fallback to trapezoidal rule for odd-numbered intervals.

### Baseline Correction

**Automatic Linear Baseline:**
1. Identify carbonyl region (1650-1800 cm⁻¹)
2. Find minima at edges (first/last 20% of region)
3. Calculate linear baseline: y = mx + b
4. Subtract baseline from spectrum

### Fit Quality Metrics

**R² (Coefficient of Determination):**
```javascript
function calculateR2(observed, fitted) {
    const yMean = mean(observed);
    const ssTot = sum((y - yMean)² for y in observed);
    const ssRes = sum((yObs - yFit)² for yObs, yFit);
    return 1 - (ssRes / ssTot);
}
```

**R²-Abs (Absorbance R²):**
Uses absolute values for comparison, important when working with transmittance data that may have negative values after baseline correction.

---

## Export Capabilities

### Excel Export

Generates `.xlsx` files with:
- Raw spectral data
- Analysis results by depth
- Concentration tables
- Summary statistics

**Implementation:** Uses SheetJS (xlsx.js) library

### PDF Export

Generates professional reports with:
- Title and timestamp
- Results summary tables
- Embedded charts (captured as images)
- Statistics with maximum values highlighted
- Institutional branding

**Implementation:**
- jsPDF for PDF generation
- html2canvas for chart capture
- jspdf-autotable for formatted tables

### HTML Export

Interactive HTML reports with embedded Plotly charts.

---

## Dependencies

All dependencies are loaded via CDN (no installation required):

| Library | Version | Purpose |
|---------|---------|---------|
| Plotly.js | 2.26.0 | Interactive charting |
| PapaParse | 5.4.1 | CSV parsing |
| SheetJS (xlsx) | 0.18.5 | Excel file handling |
| jsPDF | 2.5.1 | PDF generation |
| jspdf-autotable | 3.5.31 | PDF table formatting |
| html2canvas | 1.4.1 | Chart capture for PDF |
| numeric.js | 1.2.6 | Numerical operations |
| Bootstrap | 5.3.0 | UI framework |
| Font Awesome | 6.4.0 | Icons |
| Google Fonts (Inter) | - | Typography |

---

## Usage

### Running Locally

1. Start the Python HTTP server:
   ```bash
   python server.py
   ```

2. Open browser to `http://localhost:5000`

### Basic Workflow

1. **Load Data**: Drag and drop spectral files or click to browse
2. **Offset Correction**: Click "Auto Offset" to normalize spectra
3. **Run Analyses**: Use individual tabs or "Full Auto Analysis"
4. **Review Results**: Examine plots and tables in each tab
5. **Export**: Generate PDF or Excel reports

### Tips

- Use the depth selector to focus on specific depths
- Check fit quality (R²) before accepting deconvolution results
- Compare pre/post extraction data for adsorbed species quantification
- Export reports for documentation and further analysis

---

## Contact

**Biomaterials Group**  
University of Zaragoza / I3A  
Email: gbmunizar@gmail.com

---

## License

Copyright © 2025 Biomaterials Group, University of Zaragoza / I3A. All rights reserved.

---

## References

1. Costa, L., et al. "Oxidation in orthopaedic UHMWPE sterilized by gamma-radiation and ethylene oxide." Biomaterials (1998).
2. Kurtz, S.M. "UHMWPE Biomaterials Handbook." Academic Press (2015).
3. Medel, F.J., et al. "Vitamin E diffused, highly crosslinked UHMWPE." Biomaterials (2008).
