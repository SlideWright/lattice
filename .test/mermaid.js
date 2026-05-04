// Ensure Mermaid is loaded
if (typeof mermaid === 'undefined') {
    console.error('Mermaid library is not loaded.');
} else {
    // Initialize Mermaid without auto-start
    mermaid.initialize({
        startOnLoad: true,
        securityLevel: "loose",
        theme: "base",
        fontSize: "16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
        darkMode: false,
        themeVariables: {
            background: "#fff",
            mainBkg: "#baddfb",
            textColor: "#000",
            primaryColor: "#baddfb",
            primaryTextColor: "#000",
            primaryBorderColor: "#000",
            secondaryColor: "#c3e1c9",
            secondaryTextColor: "#000",
            secondaryBorderColor: "#000",
            tertiaryColor: "#f48eb1",
            tertiaryTextColor: "#000",
            tertiaryBorderColor: "#000",
            noteBkgColor: "#ffe680",
            noteTextColor: "f000",
            noteBorderColor: "#000",
            lineColor: "#000",
            arrowheadColor: "#000",
            titleColor: "#000",
            clusterBkg: "#f2f2f6",
            clusterBorder: "#8e8e93",
            edgeLabelBackground: "#f2f2f6",
            nodeBorder: "#000",
            nodeTextColor: "#000",
            nodeBkg: "#baddfb",
            classText: "#000",
            fillType0: "#baddfb",
            fillType1: "#c3e1c9",
            fillType2: "#f48eb1",
            fillType3: "#d6a5de",
            fillType4: "#b3e8ca",
            fillType5: "#ffccb0",
            fillType6: "#c1afe1",
            fillType7: "#f4a5d0",
            pie1: "#baddfb",
            pie2: "#c3e1c9",
            pie3: "#f48eb1",
            pie4: "#d6a5de",
            pie5: "#b3e8ca",
            pie6: "#ffccb0",
            pie7: "#c1afe1",
            pie8: "#f4a5d0",
            pie9: "#fff176",
            pie10: "#80cac3",
            pie11: "#bca9a3",
            pieTitleTextColor: "#000",
            pieSectionTextColor: "#000",
            pieLegendTextColor: "#000",
            actorBkg: "#baddfb",
            actorBorder: "#000",
            actorTextColor: "#000",
            actorLineColor: "#000",
            signalColor: "#000",
            signalTextColor: "#000",
            labelBoxBkgColor: "#ff7469",
            labelBoxBorderColor: "#ff7469",
            labelTextColor: "#000",
            loopTextColor: "#000",
            activationBorderColor: "#000",
            activationBkgColor: "#c3e1c9",
            sequenceNumberColor: "#fff",
            quadrant1Fill: "#baddfb",
            quadrant2Fill: "#c3e1c9",
            quadrant3Fill: "#f48eb1",
            quadrant4Fill: "#ffccb0",
            sectionBkgColor: "#b3b3b7",
            altSectionBkgColor: "#f2f2f6",
            taskBkgColor: "#baddfb",
            taskBorderColor: "#000",
            activeTaskBorderColor: "#000",
            activeTaskBkgColor: "#ffccb0",
            gridColor: "#000",
            doneTaskBkgColor: "#c3e1c9",
            doneTaskBorderColor: "#000",
            critBorderColor: "#000",
            critBkgColor: "#f48eb1",
            todayLineColor: "#c1afe1",
            taskTextColor: "#000",
            taskTextOutsideColor: "#000",
            taskTextLightColor: "#000",
            taskTextDarkColor: "#000",
            taskTextClickableColor: "#d6a5de",
            stateBkg: "#baddfb",
            labelBackgroundColor: "#000",
            stateLabelColor: "#000",
            transitionColor: "#000",
            transitionLabelColor: "#000",
            compositeBackground: "#f2f2f6",
            compositeTitleBackground: "#baddfb",
            compositeBorder: "#000",
            innerEndBackground: "#000",
            errorBkgColor: "#f48eb1",
            errorTextColor: "#000",
            specialStateColor: "#000",
            scaleLabelColor: "#000",
            cScale0: "#baddfb",
            cScaleLabel0: "#000",
            cScale1: "#c3e1c9",
            cScaleLabel1: "#000",
            cScale2: "#f48eb1",
            cScaleLabel2: "#000",
            cScale3: "#d6a5de",
            cScaleLabel3: "#000",
            cScale4: "#b3e8ca",
            cScaleLabel4: "#000",
            cScale5: "#ffccb0",
            cScaleLabel5: "#000",
            cScale6: "#c1afe1",
            cScaleLabel6: "#000",
            cScale7: "#f4a5d0",
            cScaleLabel7: "#000",
            cScale8: "#fff176",
            cScaleLabel9: "#000",
            cScale9: "#80cac3",
            cScale10: "#bca9a3",
            cScaleLabel10: "#000",
            cScale11: "#7fdeea",
            cScaleLabel11: "#000",
            git0: "#baddfb",
            git1: "#73c88d",
            git2: "#e4736e",
            git3: "#c5a0d8",
            git4: "#4fb7af",
            git5: "#e39d4d",
            git6: "#a2a2d5",
            git7: "#cc7b8e",
            branchLabelColor: "#000",
            tagLabelColor: "#000",
            tagLabelBackground: "#80cac3",
            tagLabelBorder: "#000",
            commitLabelColor: "#000",
            commitLabelBackground: "#bca9a3",
            requirementBackground: "#baddfb",
            requirementBorderColor: "#000",
            requirementTextColor: "#000",
            relationLabelBackground: "#fff",
            relationColor: "#000",
            relationLabelColor: "#000",
            attributeBackgroundColorOdd: "#f2f2f6",
            attributeBackgroundColorEven: "#b3b3b7",
            xyChart: {
                backgroundColor: "#f2f2f6",
                titleColor: "#000",
                plotColorPalette: "#baddfb,#c3e1c9,#f48eb1,#d6a5de,#b3e8ca,#ffccb0,#c1afe1,#f4a5d0,#fff176,#80cac3"
            }
        }
    });

    // Function to render Mermaid diagrams
    function renderMermaidDiagrams() {
        mermaid.run({
            querySelector: '.mermaid',
        });
    }

    // Initial rendering of diagrams
    renderMermaidDiagrams();

    // Set up a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver((mutationsList) => {
        let shouldRerender = false;

        // Loop through the list of mutations
        for (const mutation of mutationsList) {
            // Check if nodes have been added or removed
            if (mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length)) {
                shouldRerender = true;
                break; // No need to check further mutations
            }

            // Optionally, check for attribute changes if relevant
            if (mutation.type === 'attributes' && mutation.target.classList.contains('mermaid')) {
                shouldRerender = true;
                break;
            }
        }

        // Re-render diagrams if necessary
        if (shouldRerender) {
            renderMermaidDiagrams();
        }
    });

    // Configuration options for the observer
    const observerConfig = {
        childList: true, // Observe direct children
        subtree: true,   // And lower descendants too
        attributes: true, // Also watch for attribute changes
        characterData: false
    };

    // Start observing the document body or a specific container
    observer.observe(document.body, observerConfig);
}