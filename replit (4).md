# FTIR UHMWPE Analyzer

## Overview
This static web application analyzes FTIR (Fourier-Transform Infrared Spectroscopy) data for UHMWPE (Ultra-High Molecular Weight Polyethylene) samples. It offers advanced spectroscopic analysis, including spectrum visualization, baseline correction, peak deconvolution, multiple spectrum analysis, and data export (Excel, PDF). The project's vision is to provide a comprehensive, user-friendly tool for material scientists and researchers to quickly and accurately assess UHMWPE material degradation and adsorbed species.

## User Preferences
I prefer an iterative development approach, where changes are made incrementally and I am informed of the progress. Please ensure that core functionalities are always preserved. Before making any major architectural changes or refactoring, please ask for my approval. I appreciate detailed explanations of complex technical decisions. Ensure all solutions are robust and handle edge cases gracefully. I expect the code to be clean, well-commented, and follow best practices for maintainability.

## System Architecture
The application is a single-page static web application, primarily contained within `index.html`. It requires no build process, relying on pure HTML, CSS, and JavaScript. All external dependencies are loaded via CDN.

### UI/UX Decisions
- **Color Schemes**: Tab structures are color-coded for visual organization:
    - Carbonyl Deconvolution: Red gradient (#e74c3c to #c0392b)
    - Adsorbed Species Quantification: Green gradient (#27ae60 to #229954)
- **Data Presentation**:
    - Wavenumber axes are inverted (high to low) for spectroscopic convention.
    - Species quantification tables are horizontal and compact for data density.
    - Concentration units are standardized to mmol/cm³ for readability.
    - Color-coded species headers match graph traces.
- **Reporting**: Export functionality to PDF and Excel is provided for various analysis results.

### Technical Implementations
- **Core Analysis**:
    - **Baseline Correction**: Automatic baseline correction is applied to spectral regions.
    - **Peak Deconvolution**: Utilizes an Adam optimizer for Lorentzian-Gaussian parameter optimization (intensity, width, and Lorentzian fraction) with 500 iterations and literature-based constraints for each species.
    - **Area Calculation**: Simpson's rule is used for precise area calculation.
- **Quantification**:
    - **Oxidation, Crystallinity, TVI, Vitamin E**: Indices are calculated using peak area ratios (e.g., Area(Interest Peak) / Area(Reference Peak)).
    - **Synovial Liquid Quantification**: Calculates species concentrations (Lactones, Esters, Aldehydes, Carboxylic Acids, Ketones) and supports comparative analysis between pre-extraction and post-extraction datasets.
    - **Comparative Analysis File Import**: Supports multiple file formats including:
        - Single file mode: CSV, TXT, Excel (.xlsx, .xls), DPT, SPC, .0 formats
        - Multiple .dpt files mode: Import multiple .dpt files (one per depth) with naming convention SAMPLE_01.dpt, SAMPLE_02.dpt, etc.
        - Multi-column DPT files are automatically detected and parsed with multiple depths from a single file
- **Data Handling**:
    - Spectra visualization with multi-depth display and consistent depth coloring.
    - Automatic identification of matching depths for comparative analysis.
    - Management of `AppState` for storing and retrieving analysis results.
- **Consistency**:
    - Individual and Multiple Deconvolution modes use identical methodologies for concentration calculation and reference band determination.
    - Unified deconvolution pipeline ensures consistent results across different analysis types (e.g., Synovial Liquid analysis now uses the same pipeline as multiple deconvolution).
- **Ketone Frequency Shift Analysis**: Provides a Plotly chart showing ketone peak frequency evolution across depths, including shift from a reference frequency (1721 cm⁻¹) and a detailed data table.

### Project Structure
- The project's main file is `index.html`.
- Supplementary assets like `logo-gbm.png` and `logo.png` are in the root directory.

## External Dependencies
- **Charting**: Plotly.js
- **Data Parsing**: PapaParse
- **Spreadsheet Handling**: XLSX.js
- **PDF Generation**: jsPDF, html2canvas
- **UI Framework**: Bootstrap 5
- **Server (Development)**: Python HTTP server (for static file serving)
