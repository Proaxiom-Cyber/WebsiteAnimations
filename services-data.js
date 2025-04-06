/**
 * services-data.js
 * Configuration file for the radial chart services and labels
 */

// Export the services array to be consumed by the main script
export const services = [
    { 
        name: "Cyber Strategy & Executive Risk",
        description: "Our Cyber Strategy & Executive Risk services provide enterprise-wide roadmaps aligned with business objectives. We help organizations develop comprehensive security strategies, navigate complex regulatory landscapes, and build resilient security programs that balance protection with operational efficiency.",
        iconFile: "cyber_strategy_executive_risk.svg"
    },
    { 
        name: "Security Assessment & Architecture",
        description: "Through our Security Assessment & Architecture services, we evaluate existing security postures and design robust frameworks tailored to your environment. Our experts analyze vulnerabilities, identify control gaps, and create architectural blueprints that enhance your security while supporting business agility.",
        iconFile: "security_assessment_architecture.svg"
    },
    { 
        name: "Governance, Risk & Compliance (GRC)",
        description: "Our GRC services establish structured approaches to manage cybersecurity obligations across regulatory requirements and industry standards. We implement frameworks that streamline compliance processes, optimize risk management, and ensure your organization meets its legal and contractual obligations.",
        iconFile: "governance_risk_and_compliance.svg"
    },
    { 
        name: "Privacy, Identity & Trust",
        description: "We help organizations protect sensitive data and maintain customer trust through comprehensive privacy programs. Our identity and trust solutions ensure secure authentication, proper access controls, and data protection measures that satisfy evolving privacy regulations while enhancing user experience.",
        iconFile: "privacy_identity_and_trust.svg"
    },
    { 
        name: "Offensive Security",
        description: "Our Offensive Security services simulate real-world attacks to identify and remediate vulnerabilities before they can be exploited. Through penetration testing, red team exercises, and targeted assessments, we help you understand and address weaknesses from an attacker's perspective.",
        iconFile: "offensive_security.svg"
    },
    { 
        name: "Managed Cyber Programs",
        description: "With our Managed Cyber Programs, we provide ongoing security expertise and operational support to organizations with limited internal resources. These flexible, subscription-based services include continuous monitoring, threat detection, incident response, and specialized cybersecurity guidance.",
        iconFile: "managed_cyber_programs.svg"
    },
    { 
        name: "Cybersecurity Innovation",
        description: "Our Cybersecurity Innovation services explore emerging technologies and approaches to address evolving threats. We help organizations implement cutting-edge solutions like AI-powered defense systems, advanced threat intelligence, and security automation to stay ahead of sophisticated adversaries.",
        iconFile: "cybersecurity_innovation.svg"
    }
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
