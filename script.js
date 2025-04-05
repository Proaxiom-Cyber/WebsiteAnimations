document.addEventListener('DOMContentLoaded', () => {
    // Check if anime is loaded
    if (typeof anime === 'undefined') {
        console.error('Anime.js not loaded! Include it before this script.');
        return;
    }
    console.log("Anime.js loaded."); // Confirm library presence

    const services = [
        { name: "Cyber Strategy & Executive Risk" }, { name: "Security Assessment & Architecture" },
        { name: "Governance, Risk & Compliance (GRC)" }, { name: "Privacy, Identity & Trust" },
        { name: "Offensive Security" }, { name: "Managed Cyber Programs" },
        { name: "Cybersecurity Innovation" }
    ];

    // Config
    const minLengthFactor = 0.4; // Relative to space *outside* the visual center circle
    const maxLengthFactor = 1.0;

    // Get Elements & Constants
    const svg = document.getElementById('radial-chart-svg');
    const allWedgesGroup = document.getElementById('all-wedges-group');
    const centerCircleVisual = document.getElementById('center-circle-visual');
    const centerLogo = document.getElementById('center-logo');
    const tooltip = document.querySelector('.tooltip');

    // Basic element existence check
    if (!svg || !allWedgesGroup || !centerCircleVisual || !centerLogo || !tooltip) {
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
    const hoverMaxLengthFactor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hover-max-length-factor')) || 1.1; // Get max hover factor

    // Calculate fixed hover outer radius (target radius for active wedge)
    const hoverOuterRadius = visualInnerRadius + (maxAvailableRadialSpace * hoverMaxLengthFactor);

    // Get animation timing from CSS
    const maxDurationSeconds = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--max-animation-duration')) || 0.8;
    const timingFunction = getComputedStyle(document.documentElement).getPropertyValue('--animation-timing-function').trim() || 'ease-out';
    const shrinkScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hover-shrink-scale')) || 0.95;

    // Easing Map
    const easingMap = { 'ease': 'easeOutQuad', 'ease-in': 'easeInQuad', 'ease-out': 'easeOutQuad', 'ease-in-out': 'easeInOutQuad', 'linear': 'linear' };
    const animeEasing = easingMap[timingFunction] || 'easeOutQuad'; // Fallback
    const animationDurationMs = maxDurationSeconds * 1000; // Base duration in MS


    const wedgeColorVarsMaster = getComputedStyle(document.documentElement)
        .getPropertyValue('--wedge-colors')?.split(',').map(c => c.trim()).filter(c => c) || []; // Add fallback

    if (wedgeColorVarsMaster.length === 0) {
        console.error("FATAL: No wedge colors defined or found in CSS (--wedge-colors).");
        return; // Stop if no colors
    }

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
    let availableColors = shuffleArray([...wedgeColorVarsMaster]);
    let lastAssignedColor = null;
    for (let i = 0; i < numServices; i++) { /* ... Color assignment logic (same as before) ... */
        let chosenColor = null; let chosenIndex = -1;
        for (let j = 0; j < availableColors.length; j++) { if (availableColors[j] !== lastAssignedColor || availableColors.length === 1) { chosenIndex = j; break; } }
        if (chosenIndex === -1 && availableColors.length > 0) { chosenIndex = 0; }
        if (chosenIndex !== -1) { chosenColor = availableColors.splice(chosenIndex, 1)[0]; }
        else {
            availableColors = shuffleArray([...wedgeColorVarsMaster]); chosenIndex = -1;
            for (let j = 0; j < availableColors.length; j++) { if (availableColors[j] !== lastAssignedColor || availableColors.length === 1) { chosenIndex = j; break; } }
            if (chosenIndex !== -1) { chosenColor = availableColors.splice(chosenIndex, 1)[0]; }
            else if (availableColors.length > 0) { chosenColor = availableColors.splice(0, 1)[0]; }
            else { chosenColor = "#CCCCCC"; console.error("Critical Error assigning color."); }
        }
        assignedColors[i] = chosenColor; lastAssignedColor = chosenColor;
    }
     // console.log("Assigned Colors:", assignedColors); // Debug Log


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


    // Store all wedge group elements
    const wedgeGroups = [];
    const maxPossibleOuterRadius = visualInnerRadius + (maxAvailableRadialSpace * 1.0);

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


    // --- Create SVG Elements ---
    services.forEach((service, index) => {
        // --- LOGGING INSIDE LOOP (FIRST THING) ---
        console.log(`Entering loop for index ${index}, service: ${service.name}`);
        // --- END LOGGING ---
        try {
            const startAngle = index * anglePerWedge;
            const endAngle = startAngle + anglePerWedge;
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


            // Create Path
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", originalPathData);
            path.classList.add('wedge-path');
            path.setAttribute("fill", wedgeColor);


            // Create Marker
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            marker.setAttribute("cx", originalMarkerPos.x);
            marker.setAttribute("cy", originalMarkerPos.y);
            marker.setAttribute("r", markerRadius);
            marker.setAttribute("fill", wedgeColor);
            marker.classList.add('marker-circle');


            // Append
            wedgeGroup.appendChild(path);
            wedgeGroup.appendChild(marker);
            allWedgesGroup.appendChild(wedgeGroup); // Appending to the main SVG group

            wedgeGroups.push(wedgeGroup); // Add to JS array *only if successful*

            // Event Listeners
            wedgeGroup.addEventListener('mouseenter', handleMouseEnter);
            wedgeGroup.addEventListener('mouseleave', handleMouseLeave);

        } catch (error) {
             console.error(`Error during creation of wedge for service index ${index}:`, service.name, error);
        }
    }); // End services.forEach

    console.log(`Setup complete. Created ${wedgeGroups.length} wedge groups.`); // Log final count


    // --- Event Handler Functions (Using Anime.js) ---
    function handleMouseEnter(event) {
        try {
            const activeGroup = event.currentTarget;
            const activePath = activeGroup.querySelector('.wedge-path');
            const activeMarker = activeGroup.querySelector('.marker-circle');

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


            // Calculate duration for THIS wedge's growth
            const durationRatioActive = (maxPossibleOuterRadius > 0) ? Math.min(1, activeOriginalRadius / maxPossibleOuterRadius) : 1;
            const dynamicDurationActiveMs = (maxDurationSeconds * Math.max(0.1, durationRatioActive)) * 1000;

            // Stop any existing animation on this element before starting new ones
            anime.remove([activePath, activeMarker, activeGroup]); // Remove from group too

            // console.log(`MouseEnter Active Path: Target d="${hoverPathData.substring(0,30)}...", Duration=${dynamicDurationActiveMs}`); // Debug
            // console.log(`MouseEnter Active Marker: Target cx=${hoverMarkerPos.x}, cy=${hoverMarkerPos.y}, Duration=${dynamicDurationActiveMs}`); // Debug

            anime({
                targets: activePath,
                d: hoverPathData, // Animate the 'd' attribute
                duration: dynamicDurationActiveMs, // Use DYNAMIC duration
                easing: animeEasing
            });

            anime({
                targets: activeMarker,
                cx: hoverMarkerPos.x, // Animate cx
                cy: hoverMarkerPos.y, // Animate cy
                duration: dynamicDurationActiveMs, // Use DYNAMIC duration
                easing: animeEasing
            });

            // Animate all groups (shrink inactive, ensure active is scale 1)
            wedgeGroups.forEach(group => {
                 // Stop any previous scaling animation on the group
                 anime.remove(group); // Remove only scaling from others

                 const groupOuterRadius = parseFloat(group.dataset.originalOuterRadius);
                 if (isNaN(groupOuterRadius)) { console.warn("Skipping scale for invalid radius", group.dataset.service); return; }

                 const durationRatio = (maxPossibleOuterRadius > 0) ? Math.min(1, groupOuterRadius / maxPossibleOuterRadius) : 1;
                 const dynamicDuration = maxDurationSeconds * Math.max(0.1, durationRatio);
                 let targetScale = shrinkScale;

                 if (group === activeGroup) {
                     targetScale = 1.0;
                 }

                // console.log(`MouseEnter Scale: Group=${group.dataset.service}, TargetScale=${targetScale}, Duration=${dynamicDuration * 1000}`); // Debug

                 anime({
                     targets: group,
                     scale: targetScale,
                     duration: dynamicDuration * 1000, // Convert to ms
                     easing: animeEasing
                 });
            });

            // Show tooltip
            tooltip.textContent = activeGroup.dataset.service || 'N/A';
            tooltip.classList.add('active');

        } catch(err) { console.error("Error in mouseenter:", err); }
    }

    function handleMouseLeave(event) {
         try {
            const activeGroup = event.currentTarget; // The group being left
            const activePath = activeGroup.querySelector('.wedge-path');
            const activeMarker = activeGroup.querySelector('.marker-circle');

            // --- Animate ACTIVE wedge back using Anime.js ---
            const originalD = activeGroup.dataset.originalPath;
            const originalMX = activeGroup.dataset.originalMarkerX;
            const originalMY = activeGroup.dataset.originalMarkerY;
            const groupOuterRadius = parseFloat(activeGroup.dataset.originalOuterRadius); // Use this wedge's radius for duration

            if (!activePath || !activeMarker || !originalD || isNaN(originalMX) || isNaN(originalMY) || isNaN(groupOuterRadius)) {
                 console.error("MouseLeave: Missing elements or original data/radius.", activeGroup.dataset); return;
            }

            // Calculate duration for *this specific wedge* returning
            const durationRatio = (maxPossibleOuterRadius > 0) ? Math.min(1, groupOuterRadius / maxPossibleOuterRadius) : 1;
            const dynamicDurationMs = (maxDurationSeconds * Math.max(0.1, durationRatio)) * 1000;

            // Stop existing animations
            anime.remove([activePath, activeMarker, activeGroup]);

            // console.log(`MouseLeave Active Path: Target d="${originalD.substring(0,30)}...", Duration=${dynamicDurationMs}`); // Debug
            // console.log(`MouseLeave Active Marker: Target cx=${originalMX}, cy=${originalMY}, Duration=${dynamicDurationMs}`); // Debug

            anime({
                targets: activePath,
                d: originalD, // Animate back to original shape
                duration: dynamicDurationMs,
                easing: animeEasing
            });
            anime({
                targets: activeMarker,
                cx: originalMX, // Animate back to original position
                cy: originalMY,
                duration: dynamicDurationMs,
                easing: animeEasing
            });

            // Animate ALL wedges back to scale 1
            wedgeGroups.forEach(group => {
                // Stop any previous scaling animation
                 anime.remove(group);

                const currentGroupOuterRadius = parseFloat(group.dataset.originalOuterRadius);
                 if(isNaN(currentGroupOuterRadius)){ console.warn("Skipping scale back for group with invalid radius", group.dataset.service); return; }

                const durationRatio = (maxPossibleOuterRadius > 0) ? Math.min(1, currentGroupOuterRadius / maxPossibleOuterRadius) : 1;
                const dynamicDuration = maxDurationSeconds * Math.max(0.1, durationRatio);

                // console.log(`MouseLeave Scale: Group=${group.dataset.service}, TargetScale=1.0, Duration=${dynamicDuration * 1000}`); // Debug

                // Use anime.js for scaling back
                anime({
                     targets: group,
                     scale: 1.0, // Return all to normal scale
                     duration: dynamicDuration * 1000, // Convert to ms
                     easing: animeEasing
                 });
            });

            // Hide tooltip
            tooltip.classList.remove('active');

         } catch(err) { console.error("Error in mouseleave:", err); }
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

}); // End DOMContentLoaded