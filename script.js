document.addEventListener('DOMContentLoaded', () => {
    // Check if anime is loaded
    if (typeof anime === 'undefined') {
        console.error('Anime.js not loaded! Include it before this script.');
        return;
    }
    console.log("Anime.js loaded."); // Confirm library presence

    // Import services data
    import('./services-data.js')
        .then(module => {
            const services = module.services;
            const serviceConfig = module.config;
            console.log(`Loaded ${services.length} services from external file`);
            
            // Initialize the chart with the imported data
            initializeRadialChart(services, serviceConfig);
        })
        .catch(error => {
            console.error('Error loading services data:', error);
            // Fallback to hardcoded services if import fails
            const fallbackServices = [
                { name: "Service 1" }, { name: "Service 2" },
                { name: "Service 3" }, { name: "Service 4" }
            ];
            console.warn('Using fallback services due to import error');
            initializeRadialChart(fallbackServices, {
                minLengthFactor: 0.4,
                maxLengthFactor: 1.0,
                labelHoverScale: 1.8,
                textShrinkScale: 0.8,
                animationDuration: 0.33,
                colors: {
                    primary: [
                        '#75c9b9', // Mint
                        '#2aa1b9', // Turquoise
                        '#4c8e9a', // Teal
                        '#f16867', // Salmon
                        '#094054'  // Indigo
                    ],
                    secondary: [
                        '#588D91', // Muted teal
                        '#EB7D7A', // Warm salmon
                        '#5D9AA3', // Cool cyan-teal
                        '#DD5D5C', // Strong red-salmon
                        '#93BCC0', // Pale aqua
                        '#D99D98'  // Softer coral
                    ]
                },
                getAllColors: function() {
                    return [...this.colors.primary, ...this.colors.secondary];
                },
                getPrimaryColors: function() {
                    return [...this.colors.primary];
                }
            });
        });
});

// Move the main chart initialization into a function
function initializeRadialChart(services, serviceConfig) {
    // Config
    const minLengthFactor = serviceConfig.minLengthFactor || 0.4; // Relative to space *outside* the visual center circle
    const maxLengthFactor = serviceConfig.maxLengthFactor || 1.0;
    const labelHoverScale = serviceConfig.labelHoverScale || 1.8; // How much the active label grows
    const textShrinkScale = serviceConfig.textShrinkScale || 0.8; // Shrink inactive text labels
    const configuredAnimationDuration = serviceConfig.animationDuration || 0.5; // Animation duration from config

    // Get Elements & Constants
    const svg = document.getElementById('radial-chart-svg');
    const allWedgesGroup = document.getElementById('all-wedges-group');
    const centerCircleVisual = document.getElementById('center-circle-visual');
    const centerLogo = document.getElementById('center-logo');
    const tooltip = document.querySelector('.tooltip');
    const labelsGroup = document.getElementById('labels-and-lines-group'); // Get the new group

    // Basic element existence check
    if (!svg || !allWedgesGroup || !centerCircleVisual || !centerLogo || !tooltip || !labelsGroup) { // Check new group too
        console.error("FATAL: Essential DOM/SVG elements not found. Check HTML IDs.");
        return; // Stop execution if elements are missing
    }

    const viewBoxAttr = svg.getAttribute('viewBox');
    if (!viewBoxAttr || viewBoxAttr.split(' ').length < 4) {
        console.error("FATAL: SVG viewBox attribute is missing or invalid.");
        return;
    }
    const viewBoxSize = parseFloat(viewBoxAttr.split(' ')[2]);
    if (isNaN(viewBoxSize) || viewBoxSize <= 0) {
        console.error("FATAL: Could not parse valid viewBox size from SVG.");
        return;
    }
    const center = viewBoxSize / 2;

    const visualInnerRadius = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--center-circle-visual-radius'));
    if (isNaN(visualInnerRadius) || visualInnerRadius < 0) {
         console.error("FATAL: Could not parse valid --center-circle-visual-radius from CSS.");
         return; // Stop execution if the CSS variable is bad
    }
    centerCircleVisual.setAttribute('r', visualInnerRadius); // Ensure circle matches CSS

    const maxAvailableRadialSpace = center - visualInnerRadius; // Max radius increase from inner edge
     if (maxAvailableRadialSpace <= 0) {
         console.warn("Warning: Calculated maxAvailableRadialSpace is zero or negative. Wedges may not appear correctly.");
     }

    const markerRadius = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--marker-radius')) || 7;
    const markerArcOffsetFactor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--marker-arc-offset-factor')) || 0.8;
    const hoverMaxLengthFactor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hover-max-length-factor')) || 1.05; // Get max hover factor (ensure this matches style.css)

    // Get Label Style Variables from CSS
    const labelOffset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-offset')) || 30;
    const labelTextSize = getComputedStyle(document.documentElement).getPropertyValue('--label-text-size') || '12px'; // Ensure this matches style.css
    const labelLineColor = getComputedStyle(document.documentElement).getPropertyValue('--label-line-color') || '#777';
    const labelTextColor = getComputedStyle(document.documentElement).getPropertyValue('--label-text-color') || '#444'; // Original text color before putting in box
    const labelLineStrokeWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-line-stroke-width')) || 1;
    const labelDashArray = "3, 3"; // Dotted line style

    // Get Label Box Style Variables from CSS
    const labelBoxFill = getComputedStyle(document.documentElement).getPropertyValue('--label-box-fill') || '#666666'; // Ensure this matches style.css
    const labelBoxStroke = getComputedStyle(document.documentElement).getPropertyValue('--label-box-stroke') || '#ffffff';
    const labelBoxStrokeWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-box-stroke-width')) || 1;
    const labelBoxPadding = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-box-padding')) || 5;
    const labelBoxRx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-box-rx')) || 3;
    const labelMaxBoxWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-max-box-width')) || 150; // Get max width


    // Calculate fixed hover outer radius (target radius for active wedge)
    const hoverOuterRadius = visualInnerRadius + (maxAvailableRadialSpace * hoverMaxLengthFactor);

    // Get animation timing from CSS
    const maxDurationSeconds = configuredAnimationDuration || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--max-animation-duration')) || 0.5; // Use config value first
    const timingFunction = getComputedStyle(document.documentElement).getPropertyValue('--animation-timing-function').trim() || 'ease-out';
    const shrinkScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hover-shrink-scale')) || 0.95;
    
    // Fixed animation durations (no longer dynamic based on size)
    const fixedTextAnimationDurationMs = maxDurationSeconds * 1000; // Fixed duration for all text animations
    const fixedWedgeAnimationDurationMs = maxDurationSeconds * 1000; // Fixed duration for all wedge animations

    // Easing Map
    const easingMap = { 'ease': 'easeOutQuad', 'ease-in': 'easeInQuad', 'ease-out': 'easeOutQuad', 'ease-in-out': 'easeInOutQuad', 'linear': 'linear' };
    const animeEasing = easingMap[timingFunction] || 'easeOutQuad'; // Fallback
    // const animationDurationMs = maxDurationSeconds * 1000; // Base duration in MS (Calculated dynamically later)

    // --- Contrast Color Helper ---
    function getContrastColor(colorString) {
        let computedColor = colorString;

        // Check if it's a CSS variable
        if (colorString.startsWith('var(')) {
            const varName = colorString.match(/--[\w-]+/)[0];
            if (varName) {
                computedColor = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            }
        }

        // Now resolve the computed color (could be hex, rgb, named color)
        // Create a temporary element to let the browser parse the color
        const tempDiv = document.createElement('div');
        tempDiv.style.color = computedColor;
        document.body.appendChild(tempDiv); // Needs to be in DOM for getComputedStyle
        const finalColor = getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);

        // Parse RGB values from the computed style (e.g., "rgb(r, g, b)")
        const rgbMatch = finalColor.match(/\((\d+),\s*(\d+),\s*(\d+)/);
        if (!rgbMatch) {
            console.warn(`Could not parse RGB from color: ${colorString} -> ${computedColor} -> ${finalColor}. Defaulting to black text.`);
            return '#000000'; // Default fallback
        }

        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);

        // Calculate relative luminance (standard formula)
        const RsRGB = r / 255;
        const GsRGB = g / 255;
        const BsRGB = b / 255;

        const R = (RsRGB <= 0.03928) ? RsRGB / 12.92 : Math.pow(((RsRGB + 0.055) / 1.055), 2.4);
        const G = (GsRGB <= 0.03928) ? GsRGB / 12.92 : Math.pow(((GsRGB + 0.055) / 1.055), 2.4);
        const B = (BsRGB <= 0.03928) ? BsRGB / 12.92 : Math.pow(((BsRGB + 0.055) / 1.055), 2.4);

        const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;

        // Determine contrast color based on luminance threshold (0.5 is common)
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }


    // Get colors from config
    let primaryColors = [];
    let secondaryColors = [];
    let allColors = [];
    
    // Check if we have color functions in config
    if (serviceConfig.getPrimaryColors && typeof serviceConfig.getPrimaryColors === 'function') {
        try {
            primaryColors = serviceConfig.getPrimaryColors();
            console.log(`Loaded ${primaryColors.length} primary colors`);
        } catch (e) {
            console.warn('Error getting primary colors', e);
        }
    } else if (serviceConfig.colors && serviceConfig.colors.primary) {
        // Direct access if functions not available
        primaryColors = [...serviceConfig.colors.primary];
    }
    
    // Fallback for primary colors
    if (!primaryColors.length) {
        primaryColors = [
            '#75c9b9', // Mint
            '#2aa1b9', // Turquoise
            '#4c8e9a', // Teal
            '#f16867', // Salmon
            '#094054'  // Indigo
        ];
    }
    
    // Get all colors if available
    if (serviceConfig.getAllColors && typeof serviceConfig.getAllColors === 'function') {
        try {
            allColors = serviceConfig.getAllColors();
            // Secondary colors are all colors that aren't primary
            secondaryColors = allColors.filter(color => !primaryColors.includes(color));
            console.log(`Loaded ${allColors.length} total colors (${primaryColors.length} primary, ${secondaryColors.length} secondary)`);
        } catch (e) {
            console.warn('Error getting all colors', e);
            // If getting all colors fails, use just primary colors
            allColors = [...primaryColors];
            secondaryColors = [];
        }
    } else if (serviceConfig.colors && serviceConfig.colors.secondary) {
        // Direct access if functions not available
        secondaryColors = [...serviceConfig.colors.secondary];
        allColors = [...primaryColors, ...secondaryColors];
    } else {
        // Fallback if no secondary colors defined
        allColors = [...primaryColors];
        secondaryColors = [];
    }
    
    // Determine whether to use primary colors only or all colors
    // You can change this to primaryColors to use only primary
    const colorsToUse = allColors;
    
    console.log("Using prioritized brand colors for chart elements");

    const numServices = services.length;
    if (numServices === 0) {
         console.log("No services defined, chart will be empty.");
        return;
    }
    const anglePerWedge = 360 / numServices;


    // --- Randomization & Distribution ---

    function shuffleArray(array) { // Fisher-Yates Shuffle
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // 1. Generate and Distribute Length Factors
    let lengthFactors = [];
    if (numServices > 0) {
        const step = (maxLengthFactor - minLengthFactor) / (numServices > 1 ? numServices - 1 : 1); // Avoid division by zero
        for (let i = 0; i < numServices; i++) {
            lengthFactors.push(minLengthFactor + i * step);
        }
        // Add slight randomness & clamp
        lengthFactors = lengthFactors.map(f => {
             const randomFactor = Math.max(minLengthFactor, Math.min(maxLengthFactor, f + (Math.random() - 0.5) * step * 0.1));
             if (isNaN(randomFactor)) console.error("NaN detected in length factor calculation!");
             return randomFactor;
            });

        // Interleave Sort
        lengthFactors.sort((a, b) => a - b);
        const arrangedLengthFactors = new Array(numServices);
        let left = 0;
        let right = numServices - 1;
        for (let i = 0; i < numServices; i++) {
            arrangedLengthFactors[i] = (i % 2 === 0) ? lengthFactors[left++] : lengthFactors[right--];
        }
        lengthFactors = arrangedLengthFactors;
        // console.log("Distributed Length Factors:", lengthFactors); // Debug Log
    }

    // 2. Assign Colors
    const assignedColors = new Array(numServices);
    
    // Create separate pools for primary and secondary colors
    let availablePrimaryColors = [...primaryColors]; 
    let availableSecondaryColors = [...secondaryColors];
    let lastAssignedColor = null;
    
    console.log(`Color assignment: ${numServices} services, ${availablePrimaryColors.length} primary colors, ${availableSecondaryColors.length} secondary colors`);
    
    for (let i = 0; i < numServices; i++) {
        let chosenColor = null;
        
        // STEP 1: Try to use a primary color if any are available
        if (availablePrimaryColors.length > 0) {
            console.log(`Service ${i+1}: Using primary colors (${availablePrimaryColors.length} remaining)`);
            
            // Get primary colors that aren't the same as the last used color
            const availableNonAdjacent = availablePrimaryColors.filter(color => color !== lastAssignedColor);
            
            if (availableNonAdjacent.length > 0) {
                // Use any primary color that's not adjacent
                const index = Math.floor(Math.random() * availableNonAdjacent.length);
                chosenColor = availableNonAdjacent[index];
            } else if (availablePrimaryColors.length > 0) {
                // If all remaining primaries would be adjacent, just take any primary
                const index = Math.floor(Math.random() * availablePrimaryColors.length);
                chosenColor = availablePrimaryColors[index];
            }
            
            // Remove the chosen color from the primary pool
            const chosenIndex = availablePrimaryColors.indexOf(chosenColor);
            if (chosenIndex !== -1) {
                availablePrimaryColors.splice(chosenIndex, 1);
            }
        }
        // STEP 2: If no primary colors left, use secondary colors
        else if (availableSecondaryColors.length > 0) {
            console.log(`Service ${i+1}: Using secondary colors (${availableSecondaryColors.length} remaining)`);
            
            // Get secondary colors that aren't the same as the last used color
            const availableNonAdjacent = availableSecondaryColors.filter(color => color !== lastAssignedColor);
            
            if (availableNonAdjacent.length > 0) {
                // Use any secondary color that's not adjacent
                const index = Math.floor(Math.random() * availableNonAdjacent.length);
                chosenColor = availableNonAdjacent[index];
            } else if (availableSecondaryColors.length > 0) {
                // If all remaining secondaries would be adjacent, just take any secondary
                const index = Math.floor(Math.random() * availableSecondaryColors.length);
                chosenColor = availableSecondaryColors[index];
            }
            
            // Remove the chosen color from the secondary pool
            const chosenIndex = availableSecondaryColors.indexOf(chosenColor);
            if (chosenIndex !== -1) {
                availableSecondaryColors.splice(chosenIndex, 1);
            }
        }
        // STEP 3: If all colors are used, replenish but don't repeat the last used color
        else {
            console.log(`Service ${i+1}: Replenishing colors (all were used)`);
            
            // Replenish primary colors first (excluding the last color used)
            availablePrimaryColors = [...primaryColors].filter(color => color !== lastAssignedColor);
            
            // If there are no usable primary colors, check secondary colors
            if (availablePrimaryColors.length === 0) {
                availableSecondaryColors = [...secondaryColors].filter(color => color !== lastAssignedColor);
                
                if (availableSecondaryColors.length > 0) {
                    const index = Math.floor(Math.random() * availableSecondaryColors.length);
                    chosenColor = availableSecondaryColors[index];
                    availableSecondaryColors.splice(index, 1);
                } else {
                    // Emergency fallback - should never reach here unless there's only one color total
                    console.error("Critical error: No colors available after replenishing");
                    chosenColor = primaryColors[0] || "#75c9b9"; // Use first primary color or mint as fallback
                }
            } else {
                // Use a primary color after replenishing
                const index = Math.floor(Math.random() * availablePrimaryColors.length);
                chosenColor = availablePrimaryColors[index];
                availablePrimaryColors.splice(index, 1);
            }
        }
        
        // Assign the chosen color
        assignedColors[i] = chosenColor;
        lastAssignedColor = chosenColor;
        console.log(`Assigned ${chosenColor} to service ${i+1}`);
    }

    console.log("Final color assignments:", assignedColors);


    // --- Helper Functions ---
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        // Prevent potential NaN issues with very small radii near zero
        const safeRadius = Math.max(0, radius);
         const x = centerX + (safeRadius * Math.cos(angleInRadians));
         const y = centerY + (safeRadius * Math.sin(angleInRadians));
         if (isNaN(x) || isNaN(y)) {
             console.error(`NaN in polarToCartesian: radius=${radius}, angle=${angleInDegrees}, x=${x}, y=${y}`);
             return { x: centerX, y: centerY }; // Fallback
         }
        return { x: x, y: y };
    }

    // Create curved path between two points
    function createCurvedPath(startX, startY, endX, endY) {
        // Calculate control points for a smooth curve
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Make the curve more pronounced for longer distances
        const curveFactor = Math.min(0.5, Math.max(0.2, distance / 400));
        
        // Calculate midpoint with an offset for the curve
        const midX = startX + dx * 0.5;
        const midY = startY + dy * 0.5;
        
        // Calculate perpendicular offset for control points
        // Use vector perpendicular to the line between start and end
        const perpX = -dy * curveFactor;
        const perpY = dx * curveFactor;
        
        // Create the path data string using quadratic Bezier curve
        const pathData = `M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY}, ${endX} ${endY}`;
        
        return pathData;
    }

    function describeOuterArc(x, y, radius, startAngle, endAngle){
         const start = polarToCartesian(x, y, radius, startAngle);
         const end = polarToCartesian(x, y, radius, endAngle);
         const arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
         // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
         const d = ["A", Math.max(0,radius), Math.max(0,radius), 0, arcSweep, 1, end.x, end.y].join(" ");
          if (d.includes("NaN")) {
             console.error(`NaN detected in describeOuterArc: ${d}`);
             // Fallback or further error handling needed if this occurs
             return "A 0 0 0 0 1 0 0"; // Minimal valid arc
          }
         return d;
    }

    // Calculate path data (starts from center)
    function calculatePathData(outerR, startAng, endAng) {
        // Check inputs
        if (isNaN(outerR) || isNaN(startAng) || isNaN(endAng)) {
            console.error(`Invalid input to calculatePathData: outerR=${outerR}, startAng=${startAng}, endAng=${endAng}`);
            return "M 0 0"; // Return minimal valid path
        }
        const safeOuterR = Math.max(0, outerR);
        const outerStart = polarToCartesian(center, center, safeOuterR, startAng);
        if (isNaN(outerStart.x) || isNaN(outerStart.y)) {
             console.error(`NaN in outerStart calculation for pathData: outerR=${safeOuterR}, startAng=${startAng}`);
             return "M 0 0";
        }

        const arcData = describeOuterArc(center, center, safeOuterR, startAng, endAng);
        // Path: M(center) L(outerStart) A(outerArc) Z
        const pathString = [
            "M", center, center,
            "L", outerStart.x, outerStart.y,
            arcData, // Use pre-calculated arc data
            "Z"
        ].join(" ");
        // Basic check for NaN within the generated string (could be more robust)
        if (pathString.includes("NaN")) {
             console.error(`Generated path data contains NaN: ${pathString}`);
             return "M 0 0";
        }
        return pathString;
    }

    // --- Calculate Offset Line Start Point ---
    function calculateLineStartPoint(markerPos) {
        const angleRad = Math.atan2(markerPos.y - center, markerPos.x - center);
        const startX = markerPos.x + (markerRadius + 2) * Math.cos(angleRad);
        const startY = markerPos.y + (markerRadius + 2) * Math.sin(angleRad);
        return { x: startX, y: startY };
    }

    // Store all wedge group elements
    const wedgeGroups = [];
    const maxPossibleOuterRadius = visualInnerRadius + (maxAvailableRadialSpace * 1.0);
    const labelData = []; // Array to store data for second pass
    let maxWidth = 0;
    let maxHeight = 0; // This will now store max *line* height

    // --- LOGGING BEFORE LOOP ---
    console.log(`Starting main services loop. Number of services: ${numServices}, Length Factors count: ${lengthFactors.length}, Colors count: ${assignedColors.length}`);
    if (lengthFactors.length !== numServices || assignedColors.length !== numServices) {
         console.error("FATAL: Mismatch between services count and generated factors/colors! Check randomization logic.");
         console.log("Length Factors:", lengthFactors);
         console.log("Assigned Colors:", assignedColors);
         return; // Stop if counts don't match
    } else {
        console.log("Counts match. Proceeding with loop.");
    }
    // --- END LOGGING ---


    // --- Text Splitting Helper ---
    function splitTextIntoLines(text, maxWidthPx, fontSize) {
        // Basic approximation: character width (can be improved with canvas measurement)
        // For Poppins bold at 12px, estimate average char width (adjust as needed)
        const avgCharWidthFactor = 0.65; 
        const maxCharsPerLine = Math.floor(maxWidthPx / (parseFloat(fontSize) * avgCharWidthFactor));
        
        if (maxCharsPerLine <= 0) return [text]; // Avoid infinite loops

        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            if (currentLine.length === 0) {
                currentLine = word;
            } else {
                const testLine = currentLine + ' ' + word;
                 // Use character count as proxy for width check (simplification)
                if (testLine.length <= maxCharsPerLine) {
                    currentLine = testLine;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
             // Handle very long words that exceed maxCharsPerLine on their own
             if (currentLine.length > maxCharsPerLine && !currentLine.includes(' ')) {
                 // Simple split, could be smarter (hyphenation?)
                 lines.push(currentLine.substring(0, maxCharsPerLine));
                 currentLine = currentLine.substring(maxCharsPerLine);
                 // Keep pushing parts of the long word if needed
                 while(currentLine.length > maxCharsPerLine) {
                    lines.push(currentLine.substring(0, maxCharsPerLine));
                    currentLine = currentLine.substring(maxCharsPerLine);
                 }
             }
        });

        if (currentLine.length > 0) {
            lines.push(currentLine);
        }

        // console.log(`Splitting "${text}" (max ${maxCharsPerLine} chars):`, lines); // Debug
        return lines;
    }


    // --- Create SVG Elements (Pass 1: Measure Text) ---
    services.forEach((service, index) => {
        // --- LOGGING INSIDE LOOP (FIRST THING) ---
        console.log(`Entering loop (Pass 1) for index ${index}, service: ${service.name}`);
        // --- END LOGGING ---
        try {
            const startAngle = index * anglePerWedge;
            const endAngle = startAngle + anglePerWedge + 0.05; // Add minimal overlap for anti-aliasing
            const lengthFactor = lengthFactors[index]; // Potential error if lengthFactors is wrong size
            const wedgeColor = assignedColors[index]; // Potential error if assignedColors is wrong size

            // Add check for factors/colors existence for this index
             if (lengthFactor === undefined || isNaN(lengthFactor)) {
                console.error(`Invalid lengthFactor (${lengthFactor}) for service index ${index}. Skipping wedge.`);
                return; // Use 'return' to skip THIS iteration of forEach
             }
             if (!wedgeColor) {
                 console.error(`Missing color for service index ${index}. Skipping wedge.`);
                 return; // Skip this iteration
             }

            const originalOuterRadius = visualInnerRadius + (maxAvailableRadialSpace * lengthFactor);
            if (isNaN(originalOuterRadius)) {
                 console.error(`NaN originalOuterRadius for service index ${index}. Skipping wedge.`);
                 return; // Skip this iteration
            }

            const originalPathData = calculatePathData(originalOuterRadius, startAngle, endAngle);
            if (!originalPathData || originalPathData === "M 0 0") {
                 console.error(`Failed to calculate valid path data for service index ${index}. Skipping wedge.`);
                 return; // Skip this iteration
            }

            const markerAngle = startAngle + anglePerWedge * markerArcOffsetFactor;
            const originalMarkerPos = polarToCartesian(center, center, originalOuterRadius, markerAngle);
            if (isNaN(originalMarkerPos.x) || isNaN(originalMarkerPos.y)){
                 console.error(`NaN marker position for service index ${index}. Skipping wedge.`);
                 return; // Skip this iteration
            }


            // Create GROUP and store needed data
            const wedgeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            wedgeGroup.classList.add('wedge-group');
            wedgeGroup.dataset.service = service.name;
            wedgeGroup.dataset.originalPath = originalPathData;
            wedgeGroup.dataset.originalMarkerX = originalMarkerPos.x;
            wedgeGroup.dataset.originalMarkerY = originalMarkerPos.y;
            wedgeGroup.dataset.startAngle = startAngle;
            wedgeGroup.dataset.endAngle = endAngle;
            wedgeGroup.dataset.markerAngle = markerAngle;
            wedgeGroup.dataset.originalOuterRadius = originalOuterRadius;
            wedgeGroup.dataset.index = index; // Store index for easy lookup


            // Create Path
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", originalPathData);
            path.classList.add('wedge-path');
            path.setAttribute("fill", wedgeColor);
            // path.setAttribute("filter", "url(#wedge-shadow)"); // Temporarily remove shadow filter
            // path.setAttribute("stroke", wedgeColor); // REMOVE stroke matching fill
            // path.setAttribute("stroke-width", "1"); // REMOVE stroke width


            // Create Marker
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            marker.setAttribute("cx", originalMarkerPos.x);
            marker.setAttribute("cy", originalMarkerPos.y);
            marker.setAttribute("r", markerRadius);
            marker.setAttribute("fill", wedgeColor);
            marker.classList.add('marker-circle');


            // --- Create & Measure Text (Temporarily) ---
            const midAngle = startAngle + anglePerWedge / 2;
            const labelRadius = maxPossibleOuterRadius + labelOffset; // Position for the *text* anchor
            const labelPos = polarToCartesian(center, center, labelRadius, midAngle);

            // Determine text anchor based on angle
            let textAnchor = 'middle';
            const tolerance = 5; // Degrees tolerance for top/bottom alignment
            if (midAngle > tolerance && midAngle < 180 - tolerance) {
                textAnchor = 'start'; // Right side
            } else if (midAngle > 180 + tolerance && midAngle < 360 - tolerance) {
                textAnchor = 'end'; // Left side
            }

            // Create Text (but don't append permanently yet)
            const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            labelText.setAttribute('x', labelPos.x); // Temporary position for measurement
            labelText.setAttribute('y', labelPos.y);
            // NO dy adjustment here before measuring
            labelText.setAttribute('text-anchor', textAnchor);
            labelText.setAttribute('fill', labelTextColor); // Use temporary color for measurement if needed
            labelText.setAttribute('font-size', labelTextSize);
            labelText.classList.add('label-text'); // Apply class for styling (font)
            // labelText.textContent = service.name; // REMOVED - will use tspans

            // --- Split Text into Lines ---
            const maxTextWidthForSplit = labelMaxBoxWidth - (2 * labelBoxPadding);
            const lines = splitTextIntoLines(service.name, maxTextWidthForSplit, labelTextSize);

            // --- Measure based on longest line / number of lines ---
            let currentMaxLineWidth = 0;
            let singleLineHeight = 0;
            
             // Temporarily add text with first line to measure line height / longest line width
             if (lines.length > 0) {
                labelText.textContent = lines[0]; // Use first line for single line height estimate
                svg.appendChild(labelText);
                const tempBbox = labelText.getBBox();
                singleLineHeight = tempBbox.height; // Get height of a single line
                svg.removeChild(labelText);
                labelText.textContent = ''; // Clear it again
                
                 // Now measure width of each potential line (using temp append)
                 lines.forEach(line => {
                     labelText.textContent = line;
                     svg.appendChild(labelText);
                     currentMaxLineWidth = Math.max(currentMaxLineWidth, labelText.getBBox().width);
                     svg.removeChild(labelText);
                     labelText.textContent = '';
                 });
             }
            
             maxWidth = Math.max(maxWidth, currentMaxLineWidth); // Update overall max width based on longest single line
             maxHeight = Math.max(maxHeight, singleLineHeight); // Update max single line height

            // Store data needed for Pass 2
            labelData.push({
                index: index,
                // textElement: labelText, // Store the created text element (we'll create tspans later)
                 lines: lines, // Store the array of lines
                 numLines: lines.length, // Store how many lines this label has
                originalMarkerPos: originalMarkerPos,
                labelPos: labelPos,     // Anchor point for the text block
                textAnchor: textAnchor, // Still needed for initial box placement calculation
                // bboxWidth: bbox.width, // No longer storing full bbox width/height
                // bboxHeight: bbox.height, 
                singleLineHeight: singleLineHeight, // Store measured single line height
                wedgeColor: wedgeColor // Store the wedge color
            });

            // Append wedge group (path and marker only in this pass)
            wedgeGroup.appendChild(path);
            wedgeGroup.appendChild(marker);
            allWedgesGroup.appendChild(wedgeGroup); // Appending to the main SVG group

            wedgeGroups.push(wedgeGroup); // Add to JS array *only if successful*

            // Event Listeners (Added in Pass 1)
            wedgeGroup.addEventListener('mouseenter', handleMouseEnter);
            wedgeGroup.addEventListener('mouseleave', handleMouseLeave);

        } catch (error) {
             console.error(`Error during creation of wedge/text measurement for service index ${index}:`, service.name, error);
        }
    }); // End services.forEach (Pass 1)

    console.log(`Pass 1 complete. Max line width: ${maxWidth}, Max single line height: ${maxHeight}`);

    // Calculate uniform box dimensions based on longest line and max number of lines
    const boxWidth = Math.min(labelMaxBoxWidth, maxWidth + 2 * labelBoxPadding); // Use measured max line width, but cap at CSS max
    const estimatedLineHeightFactor = 1.2; // Factor for spacing between lines (adjust if needed)

    // --- Create Labels & Lines (Pass 2: Position and Append) ---
    console.log(`Starting Pass 2: Creating ${labelData.length} label groups. Box W: ${boxWidth} (max)`);
    labelData.forEach(data => {
        try {
            const { index, lines, numLines, originalMarkerPos, labelPos, textAnchor, singleLineHeight, wedgeColor } = data;

            // Calculate this box's specific height
            const currentBoxHeight = (numLines * singleLineHeight * estimatedLineHeightFactor) + (2 * labelBoxPadding);

            // Create the group for this label set
            const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            labelGroup.classList.add('label-group', `label-group-${index}`);

            // --- Calculate Box Position ---
            // Box top-left corner (x, y) needs to be calculated based on text anchor and uniform size
            let boxX, boxY;
            if (textAnchor === 'middle') {
                boxX = labelPos.x - boxWidth / 2;
            } else if (textAnchor === 'start') {
                boxX = labelPos.x; // Box starts where text starts
            } else { // 'end'
                boxX = labelPos.x - boxWidth; // Box ends where text ends
            }
            // Recalculate boxY based on *this* box's height
            boxY = labelPos.y - currentBoxHeight / 2;

            // Calculate and store box center
            const boxCenterX = boxX + boxWidth / 2;
            const boxCenterY = boxY + currentBoxHeight / 2;
            labelGroup.dataset.centerX = boxCenterX;
            labelGroup.dataset.centerY = boxCenterY;

            // Set initial transform to ensure proper position on page load
            const initialTransform = `translate(${boxCenterX}, ${boxCenterY}) scale(1) translate(${-boxCenterX}, ${-boxCenterY})`;

            // Create Background Box
            const labelBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            labelBox.setAttribute('x', boxX);
            labelBox.setAttribute('y', boxY);
            labelBox.setAttribute('width', boxWidth);
            labelBox.setAttribute('height', currentBoxHeight);
            labelBox.setAttribute('fill', wedgeColor); // Use wedge color for box fill
            labelBox.setAttribute('stroke', labelBoxStroke); // Set border color from CSS var
            labelBox.setAttribute('stroke-width', labelBoxStrokeWidth); // Set border width from CSS var
            labelBox.setAttribute('rx', labelBoxRx);
            labelBox.setAttribute('ry', labelBoxRx);
            labelBox.setAttribute('transform', initialTransform); // Set initial transform
            labelBox.classList.add('label-box', `label-box-${index}`);

            // Create Line
            const labelLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
            labelLine.classList.add('label-line'); // Keep generic class + index specific on group
            
            // Calculate line points
            const lineStartPoint = calculateLineStartPoint(originalMarkerPos); // Use helper
            // Create curved path data
            const pathData = createCurvedPath(
                lineStartPoint.x, 
                lineStartPoint.y, 
                boxCenterX, 
                boxCenterY
            );
            
            labelLine.setAttribute('d', pathData);
            labelLine.setAttribute('fill', 'none'); // Important for paths
            labelLine.setAttribute('stroke', labelLineColor);
            labelLine.setAttribute('stroke-width', labelLineStrokeWidth);
            labelLine.setAttribute('stroke-dasharray', labelDashArray);

            // --- Position Text Inside Box ---
            // Create the main text element (container for tspans)
            const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textElement.setAttribute('text-anchor', 'middle'); // Force middle anchor
            textElement.classList.add('label-text', `label-text-element-${index}`); // Apply class with index
            textElement.setAttribute('font-size', labelTextSize);
            textElement.setAttribute('transform', initialTransform); // Set initial transform

            // Calculate starting X and Y for the text block
            const textX = boxX + boxWidth / 2;
            // Position the baseline of the first tspan at the vertical center of the box
             const textY = boxY + currentBoxHeight / 2; 
            textElement.setAttribute('x', textX);
            textElement.setAttribute('y', textY); // Set Y for the main text element
            // textElement.setAttribute('dominant-baseline', 'hanging'); // Use hanging baseline
            textElement.setAttribute('dominant-baseline', 'middle'); // Align middle of text to Y
            textElement.setAttribute('fill', getContrastColor(wedgeColor)); // Set contrast text color

             // Add tspan elements for each line, adjusting dy
             const linesAboveCenter = (numLines - 1) / 2;
             lines.forEach((line, lineIndex) => {
                const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan.setAttribute('x', textX); // Ensure each tspan is centered
                // Set dy for line breaks (0 for first, spacing for others)
                // const dy = (lineIndex === 0) ? '0' : `${estimatedLineHeightFactor}em`; 
                
                let dy = '0';
                if (lineIndex === 0) {
                    // Shift the first line up from the center baseline
                    // Avoid dy="0em" for single lines, explicitly use "0"
                    if (numLines > 1) {
                       dy = `${-linesAboveCenter * estimatedLineHeightFactor}em`; 
                    }
                } else {
                    // Subsequent lines have standard spacing relative to the previous line
                    dy = `${estimatedLineHeightFactor}em`; 
                }

                tspan.setAttribute('dy', dy);
                tspan.textContent = line;
                textElement.appendChild(tspan);
             });


            // Append elements to the group (order matters for layering: line, box, text)
            labelGroup.appendChild(labelLine);
            labelGroup.appendChild(labelBox);
            labelGroup.appendChild(textElement); // Append the stored text element

            // Append the whole group to the main labels container
            labelsGroup.appendChild(labelGroup);

        } catch(error) {
            console.error(`Error during Pass 2 for label index ${data.index}:`, error);
        }
    });

    console.log(`Pass 2 complete. Added ${labelsGroup.children.length} label groups to the DOM.`);


    // --- Event Handler Functions (Using Anime.js) ---
    function handleMouseEnter(event) {
        try {
            const activeGroup = event.currentTarget;
            const activePath = activeGroup.querySelector('.wedge-path');
            const activeMarker = activeGroup.querySelector('.marker-circle');
            const wedgeIndex = activeGroup.dataset.index;
            const activeLabelGroup = labelsGroup.querySelector(`.label-group-${wedgeIndex}`); // Find the group
            const activeLabelLine = activeLabelGroup ? activeLabelGroup.querySelector('.label-line') : null; // Find line within group
            
            // Get service name and details for description
            const serviceName = activeGroup.dataset.service;
            const wedgeColor = activePath.getAttribute('fill');
            const serviceDetails = getServiceDescription(serviceName);
            
            // Calculate mid-angle of the wedge for positioning
            const startAngle = parseFloat(activeGroup.dataset.startAngle);
            const endAngle = parseFloat(activeGroup.dataset.endAngle);
            const midAngle = startAngle + ((endAngle - startAngle) / 2);
            
            // Show the service description
            showServiceDescription(serviceDetails, wedgeColor, midAngle);

            // --- Animate ACTIVE wedge shape/marker using Anime.js ---
            const sAngle = parseFloat(activeGroup.dataset.startAngle);
            const eAngle = parseFloat(activeGroup.dataset.endAngle);
            const mAngle = parseFloat(activeGroup.dataset.markerAngle);
            const activeOriginalRadius = parseFloat(activeGroup.dataset.originalOuterRadius); // Get radius for duration calc

            if (!activePath || !activeMarker || isNaN(sAngle) || isNaN(eAngle) || isNaN(mAngle) || isNaN(activeOriginalRadius)) {
                 console.error("MouseEnter: Missing elements or angle/radius data.", activeGroup.dataset); return;
            }

            const hoverPathData = calculatePathData(hoverOuterRadius, sAngle, eAngle);
            const hoverMarkerPos = polarToCartesian(center, center, hoverOuterRadius, mAngle);

             if (!hoverPathData || hoverPathData === "M 0 0") {
                  console.error("MouseEnter: Failed HOVER path calc."); return;
             }
             if (isNaN(hoverMarkerPos.x) || isNaN(hoverMarkerPos.y)) {
                  console.error("MouseEnter: Failed HOVER marker calc."); return;
             }

            // Stop any existing animation on these elements before starting new ones
            anime.remove([activePath, activeMarker, activeGroup, activeLabelLine]); // Remove from line too

            // console.log(`MouseEnter Active Path: Target d="${hoverPathData.substring(0,30)}...", Duration=${dynamicDurationActiveMs}`); // Debug
            // console.log(`MouseEnter Active Marker: Target cx=${hoverMarkerPos.x}, cy=${hoverMarkerPos.y}, Duration=${dynamicDurationActiveMs}`); // Debug

            anime({
                targets: activePath,
                d: hoverPathData, // Animate the 'd' attribute
                duration: fixedWedgeAnimationDurationMs, // Use FIXED duration
                easing: animeEasing
            });

            anime({
                targets: activeMarker,
                cx: hoverMarkerPos.x, // Animate cx
                cy: hoverMarkerPos.y, // Animate cy
                duration: fixedWedgeAnimationDurationMs, // Use FIXED duration
                easing: animeEasing
            });

            // Animate the label line start point
            if (activeLabelLine && !isNaN(hoverMarkerPos.x) && !isNaN(hoverMarkerPos.y)) {
                const hoverLineStartPoint = calculateLineStartPoint(hoverMarkerPos); // Use helper
                const activeLabelGroup = labelsGroup.querySelector(`.label-group-${wedgeIndex}`);
                const boxCenterX = parseFloat(activeLabelGroup.dataset.centerX || '0');
                const boxCenterY = parseFloat(activeLabelGroup.dataset.centerY || '0');
                
                // Create new curved path
                const newPathData = createCurvedPath(
                    hoverLineStartPoint.x,
                    hoverLineStartPoint.y,
                    boxCenterX,
                    boxCenterY
                );
                
                anime({
                    targets: activeLabelLine,
                    d: newPathData, // Animate the path data
                    opacity: 1.0, // Keep active line fully visible
                    duration: fixedWedgeAnimationDurationMs,
                    easing: animeEasing
                });
            } else {
                 // This might happen briefly during setup, don't log as error unless persistent
                 // console.warn("Could not find or animate active label line for index:", wedgeIndex);
            }

            // Animate all groups (shrink inactive, ensure active is scale 1)
            // Use values from config instead of hardcoded values
            wedgeGroups.forEach(group => {
                 // Stop any previous scaling animation on the group
                 anime.remove(group); // Remove only scaling from others

                 const groupIndex = group.dataset.index;
                 const labelGroup = labelsGroup.querySelector(`.label-group-${groupIndex}`);
                 if (labelGroup) {
                    anime.remove(labelGroup); // Remove scaling from label group too
                 }

                 const groupOuterRadius = parseFloat(group.dataset.originalOuterRadius);
                 if (isNaN(groupOuterRadius)) { console.warn("Skipping scale for invalid radius", group.dataset.service); return; }

                 let targetScale = shrinkScale;
                 let labelTargetScale = textShrinkScale; // Use different shrink scale for labels

                 if (group === activeGroup) {
                     targetScale = 1.0; // Active wedge doesn't change scale
                     labelTargetScale = labelHoverScale; // Active label grows significantly
                 } else {
                    // Animate INACTIVE wedge INWARDS (Shrink)
                    targetScale = shrinkScale; // Inactive wedge target scale
                    labelTargetScale = textShrinkScale; // Inactive label shrinks more
 
                    const inactivePath = group.querySelector('.wedge-path');
                    const inactiveMarker = group.querySelector('.marker-circle');
                    const inactiveLabelLine = labelGroup ? labelGroup.querySelector('.label-line') : null;

                    // Get necessary data for shrunk calculation
                    const sAngleInactive = parseFloat(group.dataset.startAngle);
                    const eAngleInactive = parseFloat(group.dataset.endAngle);
                    const mAngleInactive = parseFloat(group.dataset.markerAngle);

                    // Calculate a UNIFORM shrunk radius based on minLengthFactor
                    const uniformShrunkRadius = visualInnerRadius + (maxAvailableRadialSpace * minLengthFactor * shrinkScale);

                    // Calculate shrunk path and marker position using INACTIVE angles
                    const shrunkPathData = calculatePathData(uniformShrunkRadius, sAngleInactive, eAngleInactive);
                    const shrunkMarkerPos = polarToCartesian(center, center, uniformShrunkRadius, mAngleInactive);

                    // Stop previous animations on inactive elements
                    if (inactivePath) anime.remove(inactivePath);
                    if (inactiveMarker) anime.remove(inactiveMarker);
                    if (inactiveLabelLine) anime.remove(inactiveLabelLine);

                    // Animate INACTIVE wedge INWARDS (Shrink) to UNIFORM size
                    if (inactivePath && shrunkPathData) {
                        anime({
                            targets: inactivePath, // Target the PATH
                            d: shrunkPathData,
                            duration: fixedWedgeAnimationDurationMs, // Use FIXED duration
                            easing: animeEasing
                        });
                    }
                    if (inactiveMarker && shrunkMarkerPos) {
                        anime({
                            targets: inactiveMarker, // Target the MARKER
                            cx: shrunkMarkerPos.x,
                            cy: shrunkMarkerPos.y,
                            duration: fixedWedgeAnimationDurationMs, // Use FIXED duration
                            easing: animeEasing
                        });
                    }
                    // Animate INACTIVE line start point INWARDS
                    if (inactiveLabelLine && shrunkMarkerPos) {
                        const shrunkLineStartPoint = calculateLineStartPoint(shrunkMarkerPos);
                        const labelCenterX = parseFloat(labelGroup.dataset.centerX || '0');
                        const labelCenterY = parseFloat(labelGroup.dataset.centerY || '0');
                        
                        // Create new curved path
                        const newPathData = createCurvedPath(
                            shrunkLineStartPoint.x,
                            shrunkLineStartPoint.y,
                            labelCenterX,
                            labelCenterY
                        );
                        
                        anime({
                            targets: inactiveLabelLine,
                            d: newPathData, // Animate the path data
                            opacity: 0, // Fade out inactive lines
                            duration: fixedWedgeAnimationDurationMs,
                            easing: animeEasing
                        });
                    }
                 }

                 // Also scale the corresponding label elements (box and text)
                 if (labelGroup) {
                     const boxToScale = labelGroup.querySelector(`.label-box-${groupIndex}`);
                     const textToScale = labelGroup.querySelector(`.label-text-element-${groupIndex}`);
                     const centerX = parseFloat(labelGroup.dataset.centerX || '0');
                     const centerY = parseFloat(labelGroup.dataset.centerY || '0');

                     if (boxToScale && textToScale) { // Check elements exist
                         // Construct the target transform string for scaling around the center
                         const scale = labelTargetScale;
                         const targetTransform = `translate(${centerX}, ${centerY}) scale(${scale}) translate(${-centerX}, ${-centerY})`; // Use centerX, centerY
 
                         anime.remove([boxToScale, textToScale]); // Restore remove call ONLY in MouseEnter
 
                         // Set opacity lower for inactive elements
                         const opacity = group === activeGroup ? 1.0 : 0.0; // Completely fade out inactive boxes
                         
                         anime({
                             targets: [boxToScale, textToScale], // Target BOX and TEXT only
                             transform: targetTransform, // Animate transform attribute directly
                             opacity: opacity, // Animate opacity
                             duration: fixedTextAnimationDurationMs, // Use FIXED duration for text boxes
                             easing: animeEasing
                         });
                     }
                 }
            });

            // Show tooltip
            // tooltip.textContent = activeGroup.dataset.service || 'N/A'; // REMOVED
            // tooltip.classList.add('active'); // REMOVED

        } catch(err) { console.error("Error in mouseenter:", err); }
    }

    function handleMouseLeave(event) {
         try {
            const activeGroup = event.currentTarget; // The group being left
            const activePath = activeGroup.querySelector('.wedge-path');
            const activeMarker = activeGroup.querySelector('.marker-circle');
            const wedgeIndex = activeGroup.dataset.index;
            const activeLabelGroup = labelsGroup.querySelector(`.label-group-${wedgeIndex}`); // Find the group
            const activeLabelLine = activeLabelGroup ? activeLabelGroup.querySelector('.label-line') : null; // Find line within group

            // Hide the service description
            hideServiceDescription();
            
            // --- Animate ACTIVE wedge back using Anime.js ---
            const originalD = activeGroup.dataset.originalPath;
            const originalMX = activeGroup.dataset.originalMarkerX;
            const originalMY = activeGroup.dataset.originalMarkerY;
            const groupOuterRadius = parseFloat(activeGroup.dataset.originalOuterRadius); // Use this wedge's radius for duration

            if (!activePath || !activeMarker || !originalD || isNaN(originalMX) || isNaN(originalMY) || isNaN(groupOuterRadius)) {
                 console.error("MouseLeave: Missing elements or original data/radius.", activeGroup.dataset); return;
            }

            // Stop existing animations
            anime.remove([activePath, activeMarker, activeGroup, activeLabelLine]); // Remove from line too

            // console.log(`MouseLeave Active Path: Target d="${originalD.substring(0,30)}...", Duration=${dynamicDurationMs}`); // Debug
            // console.log(`MouseLeave Active Marker: Target cx=${originalMX}, cy=${originalMY}, Duration=${dynamicDurationMs}`); // Debug

            anime({
                targets: activePath,
                d: originalD, // Animate back to original shape
                duration: fixedWedgeAnimationDurationMs, // Use FIXED duration
                easing: animeEasing
            });
            anime({
                targets: activeMarker,
                cx: originalMX, // Animate back to original position
                cy: originalMY,
                duration: fixedWedgeAnimationDurationMs, // Use FIXED duration
                easing: animeEasing
            });

            // Animate the label line start point back
            if (activeLabelLine && !isNaN(originalMX) && !isNaN(originalMY)) {
                 const originalMarkerCenterPos = { x: parseFloat(originalMX), y: parseFloat(originalMY) };
                 const originalLineStartPoint = calculateLineStartPoint(originalMarkerCenterPos); // Use helper
                 const activeLabelGroup = labelsGroup.querySelector(`.label-group-${wedgeIndex}`);
                 const boxCenterX = parseFloat(activeLabelGroup.dataset.centerX || '0');
                 const boxCenterY = parseFloat(activeLabelGroup.dataset.centerY || '0');
                 
                 // Create original curved path
                 const originalPathData = createCurvedPath(
                     originalLineStartPoint.x,
                     originalLineStartPoint.y,
                     boxCenterX,
                     boxCenterY
                 );
                 
                anime({
                    targets: activeLabelLine,
                    d: originalPathData, // Animate the path data
                    opacity: 1.0, // Restore full opacity
                    duration: fixedWedgeAnimationDurationMs,
                    easing: animeEasing
                });
            } else {
                // This might happen briefly during setup, don't log as error unless persistent
                // console.warn("Could not find or animate active label line back for index:", wedgeIndex);
            }

            // Animate ALL wedges back to scale 1
            wedgeGroups.forEach(group => {
                // Stop any previous scaling animation
                 anime.remove(group);

                 const groupIndex = group.dataset.index;
                 const labelGroup = labelsGroup.querySelector(`.label-group-${groupIndex}`);
                 if (labelGroup) {
                    anime.remove(labelGroup);
                 }

                const currentGroupOuterRadius = parseFloat(group.dataset.originalOuterRadius);
                 if(isNaN(currentGroupOuterRadius)){ console.warn("Skipping scale back for group with invalid radius", group.dataset.service); return; }

                // Animate wedge path back to original state
                const currentPath = group.querySelector('.wedge-path');
                const originalD_current = group.dataset.originalPath;
                if (currentPath && originalD_current) {
                    anime({
                        targets: currentPath,
                        d: originalD_current,
                        duration: fixedWedgeAnimationDurationMs, // Use FIXED duration
                        easing: animeEasing
                    });
                }
                // Animate wedge marker back to original state
                const currentMarker = group.querySelector('.marker-circle');
                const originalMX_current = group.dataset.originalMarkerX;
                const originalMY_current = group.dataset.originalMarkerY;
                if (currentMarker && !isNaN(originalMX_current) && !isNaN(originalMY_current)) {
                    anime({
                        targets: currentMarker,
                        cx: originalMX_current,
                        cy: originalMY_current,
                        duration: fixedWedgeAnimationDurationMs, // Use FIXED duration
                        easing: animeEasing
                    });
                }
                // Animate label line back to original start point
                if (labelGroup && !isNaN(originalMX_current) && !isNaN(originalMY_current)) {
                    const originalMarkerCenterPos = { x: parseFloat(originalMX_current), y: parseFloat(originalMY_current) };
                    const originalLineStartPoint = calculateLineStartPoint(originalMarkerCenterPos); // Use helper
                    const labelCenterX = parseFloat(labelGroup.dataset.centerX || '0');
                    const labelCenterY = parseFloat(labelGroup.dataset.centerY || '0');
                    
                    // Create original curved path
                    const originalPathData = createCurvedPath(
                        originalLineStartPoint.x,
                        originalLineStartPoint.y,
                        labelCenterX,
                        labelCenterY
                    );
                    
                    anime({
                        targets: labelGroup.querySelector('.label-line'),
                        d: originalPathData, // Animate the path data
                        opacity: 1.0, // Restore full opacity
                        duration: fixedWedgeAnimationDurationMs,
                        easing: animeEasing
                    });
                }
                 
                 // Animate label group back to original state
                 if (labelGroup) {
                     const boxToReset = labelGroup.querySelector(`.label-box-${groupIndex}`);
                     const textToReset = labelGroup.querySelector(`.label-text-element-${groupIndex}`);
                     if (boxToReset && textToReset) {
                         // anime.remove([boxToReset, textToReset]); // Keep this commented out per user feedback
                         
                         const centerX = parseFloat(labelGroup.dataset.centerX || '0');
                         const centerY = parseFloat(labelGroup.dataset.centerY || '0');
                         // Use same transform pattern as mouseEnter but with scale=1
                         const targetTransform = `translate(${centerX}, ${centerY}) scale(1) translate(${-centerX}, ${-centerY})`;
                         
                         anime({
                             targets: [boxToReset, textToReset], // Target BOTH box and text
                             transform: targetTransform, // Use consistent transform pattern
                             opacity: 1.0, // Reset opacity to full
                             duration: fixedTextAnimationDurationMs, // Use FIXED duration for text boxes
                             easing: animeEasing
                         });
                     }
                 }
            });

            // Hide tooltip
            // tooltip.classList.remove('active'); // REMOVED

         } catch(err) { console.error("Error in mouseleave:", err); }
    }

    // Get service description from services array
    function getServiceDescription(serviceName) {
        const service = services.find(s => s.name === serviceName);
        return service ? service : { name: serviceName, description: "No description available." };
    }

    // --- Store timeout IDs for cancellation ---
    let descriptionHideTimeout = null;

    // Show service description with animation (simplified)
    function showServiceDescription(service, color, wedgeAngle) {
        // Cancel any pending hide operation
        if (descriptionHideTimeout) {
            clearTimeout(descriptionHideTimeout);
            descriptionHideTimeout = null;
        }

        const container = document.querySelector('.service-description-container');
        const nameElement = container.querySelector('.service-name');
        const descriptionElement = container.querySelector('.service-description');
        const box = container.querySelector('.service-description-box');
        
        // Update content
        nameElement.textContent = service.name;
        descriptionElement.textContent = service.description;
        
        // Update colors
        box.style.borderLeftColor = color;
        nameElement.style.setProperty('--underline-color', color);
        
        // Position based on wedge angle (left or right of SVG)
        const svgContainer = document.getElementById('radial-chart-svg');
        const svgRect = svgContainer.getBoundingClientRect();
        const isRightSide = wedgeAngle < 180;
        
        // First make it visible but off-screen for measuring
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '0';
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.right = 'auto';
        container.style.top = '0';
        container.style.transform = 'none';
        
        // Force a reflow to ensure measurements are accurate
        void container.offsetWidth;
        
        // Measure the container's height
        const containerHeight = container.offsetHeight;
        
        // Position the box with accurate vertical centering
        container.style.position = 'absolute';
        container.style.top = '50%';
        container.style.transform = `translateY(calc(-50%))`;
        
        if (isRightSide) {
            // If wedge is on right side, box on left
            container.style.left = '-350px'; 
            container.style.right = 'auto';
        } else {
            // If wedge is on left side, box on right
            container.style.right = '-350px';
            container.style.left = 'auto';
        }
        
        // Make fully visible
        container.style.opacity = '1';
    }

    // Hide service description
    function hideServiceDescription() {
        const container = document.querySelector('.service-description-container');
        if (!container) return;
        
        // Just set opacity to 0 first and let it fade out
        container.style.opacity = '0';
        
        // Only hide visibility AFTER the opacity transition completes
        const transitionDuration = 500; // Match this to the CSS transition duration
        
        // Store the timeout ID so we can cancel it if needed
        if (descriptionHideTimeout) {
            clearTimeout(descriptionHideTimeout);
        }
        
        descriptionHideTimeout = setTimeout(() => {
            // Only hide if the opacity is still 0 (no show has happened in between)
            if (container.style.opacity === '0') {
                container.style.visibility = 'hidden';
                container.style.display = 'none';
            }
            descriptionHideTimeout = null;
        }, transitionDuration);
    }

    // --- Place Center Logo ---
     const logoSizeFactor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--logo-size-factor')) || 0.6;
     const logoDiameter = visualInnerRadius * 2 * logoSizeFactor;
     const logoX = center - logoDiameter / 2;
     const logoY = center - logoDiameter / 2;
     if (centerLogo && !isNaN(logoDiameter) && !isNaN(logoX) && !isNaN(logoY)) {
         centerLogo.setAttribute('width', logoDiameter);
         centerLogo.setAttribute('height', logoDiameter);
         centerLogo.setAttribute('x', logoX);
         centerLogo.setAttribute('y', logoY);
     } else {
        console.error("Center logo element not found or calculation error during logo placement.");
     }

}