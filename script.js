// Global flag to prevent update loops
let isUpdatingInput = false;
// Keep track of the last modified input group ('vaddr' or 'indices')
let lastInputModified = 'vaddr'; 

// Funzione per formattare BigInt in decimale (per i campi input type="number")
function formatNumber(bigintValue) {
    if (bigintValue === null || bigintValue === undefined) return '';
    return bigintValue.toString();
}

// Funzione per formattare il valore esadecimale di un indice
function formatIndexHex(bigintValue, numBits) {
    if (bigintValue === null || bigintValue === undefined) return '';
    const hexPadLength = Math.ceil(numBits / 4);
    return `0x${bigintValue.toString(16).toUpperCase().padStart(hexPadLength, '0')}`;
}

// Funzione per formattare l'indirizzo virtuale (sempre esadecimale)
function formatVirtualAddress(bigintValue, bitLength) {
    if (bigintValue === null || bigintValue === undefined) return '';
    let hex = bigintValue.toString(16).toUpperCase();

    if (bitLength === 64) {
        // Per la visualizzazione a 64-bit, assicuriamo sempre 16 cifre esadecimali.
        // Questo gestisce correttamente l'estensione di segno, evitando il prefisso '-'
        // di BigInt.toString() per numeri che sarebbero negativi in 2's complement.
        hex = (bigintValue & 0xFFFFFFFFFFFFFFFFn).toString(16).toUpperCase();
        return `0x${hex.padStart(16, '0')}`; 
    } else { // 32-bit PAE
        const hexPadLength = Math.ceil(bitLength / 4);
        return `0x${hex.padStart(hexPadLength, '0')}`;
    }
}

// Funzione per generare la stringa di suddivisione dei bit
function getBitBreakdown(startBit, endBit) {
    return `(bits ${startBit}:${endBit})`;
}

// Bit ranges for each level
const BIT_RANGES = {
    '32bit_pae': {
        levels: ['pdpt', 'pd', 'pt'],
        'pdpt': { start: 31, end: 30, max: 3, shift: 30n, mask: 0x3n, bits: 2, label: 'PDPT' }, // 2 bits
        'pd': { start: 29, end: 21, max: 511, shift: 21n, mask: 0x1FFn, bits: 9, label: 'PD' }, // 9 bits
        'pt': { start: 20, end: 12, max: 511, shift: 12n, mask: 0x1FFn, bits: 9, label: 'PT' }, // 9 bits
        'offset': { start: 11, end: 0, max: 4095, shift: 0n, mask: 0xFFFn, bits: 12, label: 'Offset' } // 12 bits
    },
    '64bit_4level': {
        levels: ['pml4', 'pdpt', 'pd', 'pt'],
        'pml4': { start: 47, end: 39, max: 511, shift: 39n, mask: 0x1FFn, bits: 9, label: 'PML4' }, // 9 bits
        'pdpt': { start: 38, end: 30, max: 511, shift: 30n, mask: 0x1FFn, bits: 9, label: 'PDPT' }, // 9 bits
        'pd': { start: 29, end: 21, max: 511, shift: 21n, mask: 0x1FFn, bits: 9, label: 'PD' }, // 9 bits
        'pt': { start: 20, end: 12, max: 511, shift: 12n, mask: 0x1FFn, bits: 9, label: 'PT' }, // 9 bits
        'offset': { start: 11, end: 0, max: 4095, shift: 0n, mask: 0xFFFn, bits: 12, label: 'Offset' }, // 12 bits
        'canonical_bit': 47 // Bit used for sign extension
    },
    '64bit_5level': {
        levels: ['pml5', 'pml4', 'pdpt', 'pd', 'pt'],
        'pml5': { start: 56, end: 48, max: 511, shift: 48n, mask: 0x1FFn, bits: 9, label: 'PML5' }, // 9 bits
        'pml4': { start: 47, end: 39, max: 511, shift: 39n, mask: 0x1FFn, bits: 9, label: 'PML4' }, // 9 bits
        'pdpt': { start: 38, end: 30, max: 511, shift: 30n, mask: 0x1FFn, bits: 9, label: 'PDPT' }, // 9 bits
        'pd': { start: 29, end: 21, max: 511, shift: 21n, mask: 0x1FFn, bits: 9, label: 'PD' }, // 9 bits
        'pt': { start: 20, end: 12, max: 511, shift: 12n, mask: 0x1FFn, bits: 9, label: 'PT' }, // 9 bits
        'offset': { start: 11, end: 0, max: 4095, shift: 0n, mask: 0xFFFn, bits: 12, label: 'Offset' }, // 12 bits
        'canonical_bit': 56 // Bit used for sign extension
    }
};

// Aggiorna l'interfaccia utente in base alla modalità di paginazione selezionata
function updateUI() {
    const paginationMode = document.getElementById('paginationMode').value;
    const activeRanges = BIT_RANGES[paginationMode];

    const indexInputElements = [
        { id: 'inputPml5', name: 'pml5' },
        { id: 'inputPml4', name: 'pml4' },
        { id: 'inputPdpt', name: 'pdpt' },
        { id: 'inputPd', name: 'pd' },
        { id: 'inputPt', name: 'pt' },
        { id: 'inputOffset', name: 'offset' }
    ];

    indexInputElements.forEach(item => {
        const el = document.getElementById(item.id);
        const hexEl = document.getElementById(`${item.id}Hex`); // For decimal or hex display in input row
        const bitEl = document.getElementById(`${item.id}Bits`); // For bit breakdown text
        const parentGroup = el.closest('.index-input-group');

        const isApplicable = activeRanges[item.name];
        parentGroup.classList.toggle('d-none', !isApplicable);
        el.disabled = !isApplicable;
        
        if (isApplicable) {
            el.max = activeRanges[item.name].max;
            bitEl.textContent = getBitBreakdown(activeRanges[item.name].start, activeRanges[item.name].end);
            // Update hex display based on current decimal value
            const decimalValue = el.value ? BigInt(el.value) : 0n;
            hexEl.textContent = formatIndexHex(decimalValue, activeRanges.offset.bits);

        } else {
            el.value = ''; // Clear value if not applicable
            hexEl.textContent = '';
            bitEl.textContent = '';
        }
    });

    // Force update visualization when UI elements change (e.g., pagination mode)
    // drawPagingVisualization({}, paginationMode, true); // No need to clear here, translateAddress will handle it
    translateAddress(); // Recalculate and redraw based on current Vaddr/Indices
    
    initTooltips(); // Re-initialize tooltips for new/updated elements
}

// Gestisce il cambio di modalità di paginazione
function handlePaginationModeChange() {
    // Quando la modalità di paginazione cambia, l'indirizzo virtuale è la fonte primaria
    // per ricalcolare gli indici per la nuova struttura.
    lastInputModified = 'vaddr'; 
    translateAddress();
}

// Main translation function
function translateAddress() {
    if (isUpdatingInput) return; // Previene loop di aggiornamento

    const paginationMode = document.getElementById('paginationMode').value;
    const errorMessageContainerDiv = document.getElementById('errorMessageContainer');
    const pagingVisualizationContainerDiv = document.getElementById('pagingVisualizationContainerContainer');
    const errorMessageDiv = document.getElementById('errorMessage');
    errorMessageDiv.textContent = ''; // Pulisce eventuali messaggi di errore precedenti
    errorMessageContainerDiv.classList.remove('d-block');
    errorMessageContainerDiv.classList.add('d-none');
    pagingVisualizationContainerDiv.classList.remove('d-none');

    try {
        if (lastInputModified === 'vaddr') {
            translateVaddrToIndices(paginationMode);
        } else { // lastInputModified === 'indices'
            translateIndicesToVaddr(paginationMode);
        }
    } catch (e) {
        errorMessageDiv.textContent = e.message;
        errorMessageContainerDiv.classList.remove('d-none');
        errorMessageContainerDiv.classList.add('d-block');
        pagingVisualizationContainerDiv.classList.add('d-none');
        // IMPORTANTE: non ripristinare l'input qui per permettere all'utente di correggere
        // Clear visualization on error
        drawPagingVisualization({}, paginationMode, true); 
    }
}

function translateVaddrToIndices(paginationMode) {
    isUpdatingInput = true; // Imposta il flag di aggiornamento
    
    const virtualAddressInput = document.getElementById('virtualAddress');
    let virtualAddressBigInt = null;

    const cleanVirtualAddress = virtualAddressInput.value.trim();
    if (!cleanVirtualAddress) {
        clearAllFields(); // Pulisce tutti i campi se l'input vaddr è vuoto
        isUpdatingInput = false;
        drawPagingVisualization({}, paginationMode, true); // Clear visualization
        return; 
    }
    const hexVirtualAddress = cleanVirtualAddress.startsWith('0x') ? cleanVirtualAddress : `0x${cleanVirtualAddress}`;
    
    try {
        virtualAddressBigInt = BigInt(hexVirtualAddress);
    } catch (e) {
        isUpdatingInput = false;
        throw new Error('Virtual Address is not in hexadecimal format');
    }

    let vaddrBitLength = 0;
    const activeRanges = BIT_RANGES[paginationMode];

    if (paginationMode === '32bit_pae') {
        vaddrBitLength = 32;
        if (virtualAddressBigInt < 0 || virtualAddressBigInt > BigInt('0xFFFFFFFF')) {
            isUpdatingInput = false;
            throw new Error('32 bit virtual address is out of bound (0x00000000 - 0xFFFFFFFF)');
        }
    } else if (paginationMode === '64bit_4level' || paginationMode === '64bit_5level') {
        vaddrBitLength = 64; 
        const canonicalBit = activeRanges.canonical_bit; 
        if (canonicalBit !== undefined) {
            const signBitValue = (virtualAddressBigInt >> BigInt(canonicalBit)) & 1n; // Valore del bit canonico (0 o 1)
            
            // Maschera per isolare i bits superiori al bit canonico (dal bit canonicalBit+1 fino a 63)
            const numUpperBits = BigInt(64) - (BigInt(canonicalBit) + 1n);
            const upperBitsMask = (1n << numUpperBits) - 1n; // Maschera con 'numUpperBits' a 1
            
            const actualUpperBits = (virtualAddressBigInt >> BigInt(canonicalBit + 1)) & upperBitsMask;

            let expectedUpperBits = 0n;
            if (signBitValue === 1n) {
                expectedUpperBits = upperBitsMask; 
            }
            
            if (actualUpperBits !== expectedUpperBits) {
                const errorMsg = `Non-canonical 64 bit virtual address: upper bits (${canonicalBit + 1} to 63) are not a sign extension of the ${canonicalBit}th bit`;
                isUpdatingInput = false;
                throw new Error(errorMsg);
            }
        }
    }
    
    const pageOffset = (virtualAddressBigInt >> activeRanges.offset.shift) & activeRanges.offset.mask;
    document.getElementById('inputOffset').value = formatNumber(pageOffset);
    document.getElementById('inputOffsetHex').textContent = formatIndexHex(pageOffset, activeRanges.offset.bits);

    const currentIndices = {};
    if (activeRanges.pml5) {
        const pml5Index = (virtualAddressBigInt >> activeRanges.pml5.shift) & activeRanges.pml5.mask;
        document.getElementById('inputPml5').value = formatNumber(pml5Index);
        document.getElementById('inputPml5Hex').textContent = formatIndexHex(pml5Index, activeRanges.offset.bits);
        currentIndices.pml5 = pml5Index;
    } else {
        document.getElementById('inputPml5').value = ''; 
        document.getElementById('inputPml5Hex').textContent = '';
    }
    if (activeRanges.pml4) {
        const pml4Index = (virtualAddressBigInt >> activeRanges.pml4.shift) & activeRanges.pml4.mask;
        document.getElementById('inputPml4').value = formatNumber(pml4Index);
        document.getElementById('inputPml4Hex').textContent = formatIndexHex(pml4Index, activeRanges.offset.bits);
        currentIndices.pml4 = pml4Index;
    } else {
        document.getElementById('inputPml4').value = '';
        document.getElementById('inputPml4Hex').textContent = '';
    }
    if (activeRanges.pdpt) {
        const pdptIndex = (virtualAddressBigInt >> activeRanges.pdpt.shift) & activeRanges.pdpt.mask;
        document.getElementById('inputPdpt').value = formatNumber(pdptIndex);
        document.getElementById('inputPdptHex').textContent = formatIndexHex(pdptIndex, activeRanges.offset.bits);
        currentIndices.pdpt = pdptIndex;
    } else {
        document.getElementById('inputPdpt').value = '';
        document.getElementById('inputPdptHex').textContent = '';
    }
    if (activeRanges.pd) {
        const pdIndex = (virtualAddressBigInt >> activeRanges.pd.shift) & activeRanges.pd.mask;
        document.getElementById('inputPd').value = formatNumber(pdIndex);
        document.getElementById('inputPdHex').textContent = formatIndexHex(pdIndex, activeRanges.offset.bits);
        currentIndices.pd = pdIndex;
    } else {
        document.getElementById('inputPd').value = '';
        document.getElementById('inputPdHex').textContent = '';
    }
    if (activeRanges.pt) {
        const ptIndex = (virtualAddressBigInt >> activeRanges.pt.shift) & activeRanges.pt.mask;
        document.getElementById('inputPt').value = formatNumber(ptIndex);
        document.getElementById('inputPtHex').textContent = formatIndexHex(ptIndex, activeRanges.offset.bits);
        currentIndices.pt = ptIndex;
    } else {
        document.getElementById('inputPt').value = '';
        document.getElementById('inputPtHex').textContent = '';
    }
    currentIndices.offset = pageOffset;

    drawPagingVisualization(currentIndices, paginationMode); // Draw visualization
    isUpdatingInput = false; // Rilascia il flag
}

function translateIndicesToVaddr(paginationMode) {
    isUpdatingInput = true; // Imposta il flag di aggiornamento
    
    let pml5Index = 0n, pml4Index = 0n, pdptIndex = 0n, pdIndex = 0n, ptIndex = 0n, pageOffset = 0n;
    const activeRanges = BIT_RANGES[paginationMode];

    // Ottiene e convalida i valori di input per gli indici
    const currentIndices = {};
    try {
        if (activeRanges.pml5 && !document.getElementById('inputPml5').disabled) {
            pml5Index = BigInt(document.getElementById('inputPml5').value || '0');
            if (pml5Index < 0 || pml5Index > activeRanges.pml5.max) throw new Error(`PML5 Index must be between 0 and ${activeRanges.pml5.max}`);
            document.getElementById('inputPml5Hex').textContent = formatIndexHex(pml5Index, activeRanges.offset.bits);
            currentIndices.pml5 = pml5Index;
        } else {
            document.getElementById('inputPml5Hex').textContent = '';
        }
        if (activeRanges.pml4 && !document.getElementById('inputPml4').disabled) {
            pml4Index = BigInt(document.getElementById('inputPml4').value || '0');
            if (pml4Index < 0 || pml4Index > activeRanges.pml4.max) throw new Error(`PML4 Index must be between 0 and ${activeRanges.pml4.max}`);
            document.getElementById('inputPml4Hex').textContent = formatIndexHex(pml4Index, activeRanges.offset.bits);
            currentIndices.pml4 = pml4Index;
        } else {
            document.getElementById('inputPml4Hex').textContent = '';
        }
        if (activeRanges.pdpt && !document.getElementById('inputPdpt').disabled) {
            pdptIndex = BigInt(document.getElementById('inputPdpt').value || '0');
            if (pdptIndex < 0 || pdptIndex > activeRanges.pdpt.max) throw new Error(`PDPT Index must be between 0 and ${activeRanges.pdpt.max}`);
            document.getElementById('inputPdptHex').textContent = formatIndexHex(pdptIndex, activeRanges.offset.bits);
            currentIndices.pdpt = pdptIndex;
        } else {
            document.getElementById('inputPdptHex').textContent = '';
        }
        if (activeRanges.pd && !document.getElementById('inputPd').disabled) {
            pdIndex = BigInt(document.getElementById('inputPd').value || '0');
            if (pdIndex < 0 || pdIndex > activeRanges.pd.max) throw new Error(`PD Index must be between 0 and ${activeRanges.pd.max}`);
            document.getElementById('inputPdHex').textContent = formatIndexHex(pdIndex, activeRanges.offset.bits);
            currentIndices.pd = pdIndex;
        } else {
            document.getElementById('inputPdHex').textContent = '';
        }
        if (activeRanges.pt && !document.getElementById('inputPt').disabled) {
            ptIndex = BigInt(document.getElementById('inputPt').value || '0');
            if (ptIndex < 0 || ptIndex > activeRanges.pt.max) throw new Error(`PT Index must be between 0 and ${activeRanges.pt.max}`);
            document.getElementById('inputPtHex').textContent = formatIndexHex(ptIndex, activeRanges.offset.bits);
            currentIndices.pt = ptIndex;
        } else {
            document.getElementById('inputPtHex').textContent = '';
        }
        // Offset è sempre attivo
        pageOffset = BigInt(document.getElementById('inputOffset').value || '0');
        if (pageOffset < 0 || pageOffset > activeRanges.offset.max) throw new Error(`Page Offset must be between 0 and ${activeRanges.offset.max}`);
        document.getElementById('inputOffsetHex').textContent = formatIndexHex(pageOffset, activeRanges.offset.bits);
        currentIndices.offset = pageOffset;

    } catch (e) {
        isUpdatingInput = false;
        drawPagingVisualization({}, paginationMode, true); // Clear visualization
        throw new Error(e.message);
    }
    
    let virtualAddressBigInt = 0n;
    let vaddrBitLength = 0;

    if (paginationMode === '32bit_pae') {
        virtualAddressBigInt |= (pdptIndex << activeRanges.pdpt.shift);
        virtualAddressBigInt |= (pdIndex << activeRanges.pd.shift);
        virtualAddressBigInt |= (ptIndex << activeRanges.pt.shift);
        virtualAddressBigInt |= (pageOffset << activeRanges.offset.shift);
        vaddrBitLength = 32;
    } else if (paginationMode === '64bit_4level') {
        virtualAddressBigInt |= (pml4Index << activeRanges.pml4.shift);
        virtualAddressBigInt |= (pdptIndex << activeRanges.pdpt.shift);
        virtualAddressBigInt |= (pdIndex << activeRanges.pd.shift);
        virtualAddressBigInt |= (ptIndex << activeRanges.pt.shift);
        virtualAddressBigInt |= (pageOffset << activeRanges.offset.shift);
        vaddrBitLength = 64;

        // Applica la forma canonica per indirizzi a 64-bit (4-livelli)
        const canonicalBit = activeRanges.canonical_bit; // 47
        const signBit = (virtualAddressBigInt >> BigInt(canonicalBit)) & 1n;

        if (signBit === 1n) {
            // Se il bit 47 è 1, riempi tutti i bits superiori (48-63) con 1
            const higherBitsMask = (~0n << BigInt(canonicalBit + 1)); 
            virtualAddressBigInt |= higherBitsMask;
        }
    } else if (paginationMode === '64bit_5level') {
        virtualAddressBigInt |= (pml5Index << activeRanges.pml5.shift);
        virtualAddressBigInt |= (pml4Index << activeRanges.pml4.shift);
        virtualAddressBigInt |= (pdptIndex << activeRanges.pdpt.shift);
        virtualAddressBigInt |= (pdIndex << activeRanges.pd.shift);
        virtualAddressBigInt |= (ptIndex << activeRanges.pt.shift);
        virtualAddressBigInt |= (pageOffset << activeRanges.offset.shift);
        vaddrBitLength = 64;

        // Applica la forma canonica per indirizzi a 64-bit (5-livelli)
        const canonicalBit = activeRanges.canonical_bit; // 56
        const signBit = (virtualAddressBigInt >> BigInt(canonicalBit)) & 1n;

        if (signBit === 1n) {
            // Se il bit 56 è 1, riempi tutti i bits superiori (57-63) con 1
            const higherBitsMask = (~0n << BigInt(canonicalBit + 1)); 
            virtualAddressBigInt |= higherBitsMask;
        }
    }

    document.getElementById('virtualAddress').value = formatVirtualAddress(virtualAddressBigInt, vaddrBitLength); // Aggiorna campo input Vaddr
    
    drawPagingVisualization(currentIndices, paginationMode); // Draw visualization
    isUpdatingInput = false; // Rilascia il flag
}

// Pulisce tutti i campi di input e output
function clearAllFields() {
    document.getElementById('virtualAddress').value = '';

    const indexInputElements = [
        { id: 'inputPml5', name: 'pml5' },
        { id: 'inputPml4', name: 'pml4' },
        { id: 'inputPdpt', name: 'pdpt' },
        { id: 'inputPd', name: 'pd' },
        { id: 'inputPt', name: 'pt' },
        { id: 'inputOffset', name: 'offset' }
    ];

    indexInputElements.forEach(item => {
        const el = document.getElementById(item.id);
        const hexEl = document.getElementById(`${item.id}Hex`);
        el.value = '';
        hexEl.textContent = '';
    });

    document.getElementById('errorMessage').textContent = '';
    document.getElementById('errorMessageContainer').classList.remove('d-block');
    document.getElementById('errorMessageContainer').classList.add('d-none');
    pagingVisualizationContainerDiv.classList.remove('d-none');
}

// Inizializza i tooltip di Bootstrap
function initTooltips() {
    // Distrugge i tooltip esistenti per prevenire duplicati
    var existingTooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    existingTooltips.forEach(function (el) {
        var tooltip = bootstrap.Tooltip.getInstance(el);
        if (tooltip) {
            tooltip.dispose();
        }
    });
    // Inizializza nuovi tooltip
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Funzione per disegnare la visualizzazione SVG della paginazione
function drawPagingVisualization(indices, paginationMode, clearOnly = false) {
    const svg = document.getElementById('pagingVisualization');
    svg.innerHTML = ''; // Clear previous drawing

    if (clearOnly) {
        // If clearing, just reset viewBox to a default state to prevent weird sizing issues
        svg.setAttribute('viewBox', `0 0 700 120`);
        return;
    }

    const activeRanges = BIT_RANGES[paginationMode];
    const levels = activeRanges.levels;

    const blockWidth = 90; // Width of each block
    const blockHeight = 50; // Height of each block
    const horizontalSpacing = 25; // Spacing between blocks
    const verticalCenter = svg.viewBox.baseVal.height / 2; // Center vertically

    const arrowPadding = 2; 

    let currentX = 20; // Starting X position

    // Define arrowhead marker (triangular with rounded edges)
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '6');   
    marker.setAttribute('markerHeight', '6');  
    marker.setAttribute('refX', '5');          // Adjusted refX to position the tip correctly
    marker.setAttribute('refY', '3');          // Center of the marker
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth'); // Scale with stroke width
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('d', 'M0,1 Q 0,0 1,.5 L5,2.5 Q 6,3 5,3.5 L1,5.5 Q 0,6 0,5 Z'); 
    path.setAttribute('fill', 'var(--bs-border-color)'); /* Arrowhead color matching line in dark theme */
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // CR3 Block
    const cr3RectX = currentX;
    const cr3Rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    cr3Rect.setAttribute('x', cr3RectX);
    cr3Rect.setAttribute('y', verticalCenter - blockHeight / 2);
    cr3Rect.setAttribute('width', blockWidth);
    cr3Rect.setAttribute('height', blockHeight);
    cr3Rect.classList.add('paging-block'); // Base style
    svg.appendChild(cr3Rect);

    const cr3Text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    cr3Text.setAttribute('x', cr3RectX + blockWidth / 2);
    cr3Text.setAttribute('y', verticalCenter + 5); // Center text
    cr3Text.classList.add('block-label', 'cr3-label');
    cr3Text.textContent = 'CR3';
    svg.appendChild(cr3Text);

    let prevBlockX = cr3RectX + blockWidth; // Right edge of CR3 block

    // Loop through active levels
    levels.forEach(levelName => {
        const levelInfo = activeRanges[levelName];
        const rectX = prevBlockX + horizontalSpacing;

        // Draw arrow from previous block to current
        const arrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
        arrow.setAttribute('x1', prevBlockX);
        arrow.setAttribute('y1', verticalCenter);
        // Terminate before the next block, accounting for arrowhead width AND padding
        // Using marker's refX for more accurate positioning
        arrow.setAttribute('x2', rectX - 2*arrowPadding); 
        arrow.setAttribute('y2', verticalCenter);
        arrow.classList.add('arrow-line');
        svg.appendChild(arrow);

        // Table Block
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute('x', rectX);
        rect.setAttribute('y', verticalCenter - blockHeight / 2);
        rect.setAttribute('width', blockWidth);
        rect.setAttribute('height', blockHeight);
        rect.classList.add('paging-block', 'table-block'); // Add table-block class
        svg.appendChild(rect);

        const textLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textLabel.setAttribute('x', rectX + blockWidth / 2);
        textLabel.setAttribute('y', verticalCenter - 5); // Center text, slightly above index
        textLabel.classList.add('block-label');
        textLabel.textContent = `${levelInfo.label} Table`;
        svg.appendChild(textLabel);

        // Display index in decimal
        const indexValue = indices[levelName] !== undefined ? formatNumber(indices[levelName]) : 'N/A';
        const indexText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        indexText.setAttribute('x', rectX + blockWidth / 2);
        indexText.setAttribute('y', verticalCenter + 15); // Below label
        indexText.classList.add('index-value');
        indexText.textContent = `Index ${indexValue}`;
        svg.appendChild(indexText);

        prevBlockX = rectX + blockWidth; // Update for next block
    });

    // Physical Page Block (after final arrow)
    const physicalPageRectX = prevBlockX + horizontalSpacing;

    // Arrow to Physical Page
    const finalArrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
    finalArrow.setAttribute('x1', prevBlockX);
    finalArrow.setAttribute('y1', verticalCenter);
    // Terminate before the physical page block, accounting for arrowhead width AND padding
    finalArrow.setAttribute('x2', physicalPageRectX - 2*arrowPadding); 
    finalArrow.setAttribute('y2', verticalCenter);
    finalArrow.classList.add('arrow-line');
    svg.appendChild(finalArrow);

    const physicalPageRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    physicalPageRect.setAttribute('x', physicalPageRectX);
    physicalPageRect.setAttribute('y', verticalCenter - blockHeight / 2);
    physicalPageRect.setAttribute('width', blockWidth + 20); // Slightly wider for offset
    physicalPageRect.setAttribute('height', blockHeight);
    physicalPageRect.classList.add('paging-block'); // Base style
    svg.appendChild(physicalPageRect);

    const physicalPageLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    physicalPageLabel.setAttribute('x', physicalPageRectX + (blockWidth + 20) / 2);
    physicalPageLabel.setAttribute('y', verticalCenter - 5);
    physicalPageLabel.classList.add('block-label');
    physicalPageLabel.textContent = 'Physical Page';
    svg.appendChild(physicalPageLabel);

    // Display offset in hexadecimal
    const offsetValue = indices.offset !== undefined ? formatIndexHex(indices.offset, activeRanges.offset.bits) : 'N/A';
    const offsetText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    offsetText.setAttribute('x', physicalPageRectX + (blockWidth + 20) / 2);
    offsetText.setAttribute('y', verticalCenter + 15);
    offsetText.classList.add('offset-value');
    offsetText.textContent = `Offset ${offsetValue}`;
    svg.appendChild(offsetText);

    // Adjust SVG viewBox width dynamically based on content
    const requiredWidth = physicalPageRectX + (blockWidth + 20) + 20; // Add some padding
    svg.setAttribute('viewBox', `0 0 ${requiredWidth} ${svg.viewBox.baseVal.height}`);
}

// Aggiunge gli event listener al caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
    // Event listener per l'input dell'Indirizzo Virtuale
    document.getElementById('virtualAddress').addEventListener('input', () => {
        if (!isUpdatingInput) {
            lastInputModified = 'vaddr';
            translateAddress();
        }
    });

    // Event listeners per gli input degli Indici
    const indexInputIds = ['inputPml5', 'inputPml4', 'inputPdpt', 'inputPd', 'inputPt', 'inputOffset'];
    indexInputIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => {
                // Aggiorna immediatamente la visualizzazione esadecimale/decimale nell'input form
                const activeRanges = BIT_RANGES[document.getElementById('paginationMode').value];
                // Extract name (e.g., 'pml5', 'pdpt', 'pd', 'offset') from ID
                let inputName = id.replace('input', '').toLowerCase(); 
                
                const rangeInfo = activeRanges[inputName];
                if (rangeInfo) {
                    const decimalValue = element.value ? BigInt(element.value) : 0n;
                    
                    const hexDisplayElement = document.getElementById(`${id}Hex`); // Ensure correct ID
                    if (hexDisplayElement) {
                        if (inputName === 'offset') {
                            hexDisplayElement.textContent = formatIndexHex(decimalValue, rangeInfo.bits);
                        } else {
                            hexDisplayElement.textContent = formatNumber(decimalValue);
                        }
                    }
                }

                if (!isUpdatingInput) {
                    lastInputModified = 'indices';
                    translateAddress();
                }
            });
        }
    });

    updateUI(); // Imposta lo stato iniziale dell'interfaccia (mostra/nasconde i campi indice)
    // No need to call translateAddress here, as updateUI calls it at the end
});