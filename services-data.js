/**
 * services-data.js
 * Configuration file for the radial chart services and labels
 */

// Export the services array to be consumed by the main script
export const services = [
    { name: "Cyber Strategy & Executive Risk" },
    { name: "Security Assessment & Architecture" },
    { name: "Governance, Risk & Compliance (GRC)" },
    { name: "Privacy, Identity & Trust" },
    { name: "Offensive Security" },
    { name: "Managed Cyber Programs" },
    { name: "Cybersecurity Innovation" }
];

// You can add additional configurations here as needed
export const config = {
    // Visual configuration
    minLengthFactor: 0.4, // Relative to space outside the visual center circle
    maxLengthFactor: 1.0,
    
    // Animation configuration
    labelHoverScale: 1.8, // How much the active label grows (80% increase)
    textShrinkScale: 0.8, // Shrink inactive text labels for better contrast
    animationDuration: 0.33, // Animation duration in seconds (33% of original to be 50% faster)
    
    // Color configuration
    colors: {
        // Primary brand colors (prioritized)
        primary: [
            '#75c9b9', // Mint
            '#2aa1b9', // Turquoise (IR IS BLUE)
            '#4c8e9a', // Teal
            '#f16867', // Salmon
            '#094054'  // Indigo
        ],
        
        // Secondary brand colors
        secondary: [
            '#beebdb', // Peppermint
            '#a5d6da', // Sky Blue
            '#e5e3d6', // Cotton
            
            // Additional secondary colors
            '#588D91', // RGB(88, 141, 145) – a muted teal
            '#EB7D7A', // RGB(235, 125, 122) – a warm salmon
            '#5D9AA3', // RGB(93, 154, 163) – a cool cyan-teal
            '#DD5D5C', // RGB(221, 93, 92) – a strong red-salmon
            '#93BCC0', // RGB(147, 188, 192) – a pale aqua
            '#D99D98'  // RGB(217, 157, 152) – a softer coral
        ]
    },
    
    // Get all colors as flat array (for convenience)
    getAllColors: function() {
        return [...this.colors.primary, ...this.colors.secondary];
    },
    
    // Get primary colors only
    getPrimaryColors: function() {
        return [...this.colors.primary];
    }
};
