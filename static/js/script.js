document.addEventListener('DOMContentLoaded', function () {
    const copyButton = document.getElementById('copy-button');
    const downloadButton = document.getElementById('download-button');
    const attributesToRemove = [
        ".youtube-card",
        ".thumbnail-cropper",
        ".thumb-padding",
        ".infos",
        ".title",
        ".logo",
        ".publication-date",
        ".view-count",
        ".channel-title",
    ];

    function captureImage() {
        const node = document.querySelector('.youtube-card');
        const exportSizeSlider = document.querySelector('#export-size-slider').value;
        return htmlToImage.toPng(node, {
            canvasWidth: node.offsetWidth * exportSizeSlider,
            canvasHeight: node.offsetHeight * exportSizeSlider,
            quality: 1,
        });
    }

    function toggleLoader(button) {
        button.querySelector('.custom-loader').classList.toggle('hidden');
        button.querySelector('i').classList.toggle('hidden');
    }

    copyButton.addEventListener('click', function (e) {
        const originalAttributes = removeAttributes();
        toggleLoader(copyButton);

        setTimeout(() => {
            captureImage().then(function (dataUrl) {
                const blob = dataUrlToBlob(dataUrl);
                const clipboardItem = new ClipboardItem({'image/png': blob});
                navigator.clipboard.write([clipboardItem])
                    .then(() => {
                        const buttonInnerSpan = copyButton.querySelector("span");
                        buttonInnerSpan.innerText = 'Copied !';
                        restoreAttributes(originalAttributes);
                        toggleLoader(copyButton);
                        setTimeout(() => {
                            buttonInnerSpan.innerText = 'Clipboard';
                        }, 2000);
                    })
                    .catch(err => console.error('Failed to copy: ', err));
            }).catch(function (error) {
                console.error('Could not capture image:', error);
            });
        }, 250); // Attendre 1000 ms (1 seconde)
    });

    downloadButton.addEventListener('click', function (e) {
        const originalAttributes = removeAttributes();
        toggleLoader(downloadButton);
        setTimeout(() => {
            captureImage().then(function (dataUrl) {
                const link = document.createElement('a');
                link.download = 'youtube-card.png'; // Nom du fichier
                link.href = dataUrl;
                link.click();
                link.remove();
            }).catch(function (error) {
                console.error('Could not capture image:', error);
            }).then(() => {
                toggleLoader(downloadButton);
                restoreAttributes(originalAttributes);
            })
        }, 250);
    });

    function dataUrlToBlob(dataUrl) {
        const parts = dataUrl.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], {type: contentType});
    }

    function removeAttributes() {
        const originalAttributes = [];
        attributesToRemove.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                const originalStyle = element.getAttribute("style");
                const originalClass = element.getAttribute("class");

                originalAttributes.push({
                    selector,
                    style: originalStyle,
                    class: originalClass,
                    prefixedStyle: element.getAttribute(":style"),
                    prefixedClass: element.getAttribute(":class")
                });

                if (element.hasAttribute(":style")) {
                    element.removeAttribute(":style");
                    setTimeout(() => {
                        element.setAttribute("style", originalStyle);
                    }, 0);
                }
                if (element.hasAttribute(":class")) {
                    element.removeAttribute(":class");
                    setTimeout(() => {
                        element.setAttribute("class", originalClass);
                    }, 0);
                }
            }
        });
        return originalAttributes;
    }

    function restoreAttributes(originalAttributes) {
        originalAttributes.forEach(attr => {
            const element = document.querySelector(attr.selector);
            if (element) {
                if (attr.prefixedStyle) {
                    element.setAttribute(":style", attr.prefixedStyle);
                }
                if (attr.prefixedClass) {
                    element.setAttribute(":class", attr.prefixedClass);
                }
                if (attr.style !== null) {
                    element.setAttribute("style", attr.style);
                }
                if (attr.class !== null) {
                    element.setAttribute("class", attr.class);
                }
            }
        });
    }

});

function simplifyNumber(value) {
    const suffixes = ['', 'k', 'M', 'B', 'T'];
    let suffixNum = 0;
    let number = parseFloat(value.toString().replace(/,/g, ""));

    while (number >= 1000) {
        number /= 1000;
        suffixNum++;
    }

    return `${Number(number.toFixed(1))}${suffixes[suffixNum]}`;
}


document.addEventListener('alpine:init', () => {
    Alpine.data('youtubeConfig', () => ({
        showError: '',
        exportSizeText: 'Export size: ',
        settings: {
            darkMode: true,
            language: 'en',
            sliders: {
                borderRadius: {label: 'Border Radius', default: 12, min: 0, max: 24, step: 1},
                thumbPadding: {label: 'Card Padding', default: 12, min: 2, max: 24, step: 1},
                fontSize: {label: 'Title Size', default: 20, min: 16, max: 48, step: 1},
                infosSize: {
                    label: 'Info Size', default: 16, min: 12, max: 24, step: 1,
                    visibility: ['showViewCount', 'showPublicationDate', 'showChannelName']
                },
                logoSize: {label: 'Logo Size', default: 96, min: 24, max: 128, step: 4, visibility: ['showLogo']},
                logoYOffset: {label: 'Logo Y Offset', default: 0, min: 0, max: 48, step: 1, visibility: ['showLogo']},
            },
            exportSize: {label: 'Size', default: 1, min: 1, max: 5, step: .25},
            checkboxes: {
                showLogo: {label: 'Channel logo', value: true},
                showChannelName: {label: 'Channel name', value: true},
                showPublicationDate: {label: 'Publication date', value: true},
                showDuration: {label: 'Duration', value: true},
                showViewCount: {label: 'View count', value: true},
                showViewCountComma: {label: 'Add comma', value: true, visibility: ['showViewCount'], style: "pl-6"},
                showSimplifyViewCount: {label: 'Simplify number', value: false, visibility: ['showViewCount'], style: "pl-6"},
            }
        },
        validateAndTriggerRequest() {
            const regex = /^(https?:\/\/)?(www\.)?(youtube.com\/watch\?v=|youtu.be\/)[\w-]+$/;
            if (!this.videoUrl.match(regex)) {
                this.showError = true;
                return; // Ne pas déclencher la requête si l'URL n'est pas valide
            }
            this.updateUrl();
            this.showError = false; // Effacer les messages d'erreur précédents
            htmx.trigger("#video_url", "fetchCard", {language: this.settings.language});
        },
        changeLanguage() {
            this.updateUrl()
            htmx.trigger("#video_url", "fetchCard");
        },
        isVisibleSlider(sliderKey) {
            const slider = this.settings.sliders[sliderKey];
            if (!slider.visibility) return true;
            return slider.visibility.some(condition => this.settings.checkboxes[condition].value);
        },
        isVisibleCheckbox(checkboxKey) {
            const checkbox = this.settings.checkboxes[checkboxKey];
            if (!checkbox.visibility) return true;
            return checkbox.visibility.some(condition => this.settings.checkboxes[condition].value);
        },
        resetAllSliders() {
            Object.keys(this.settings.sliders).forEach(key => {
                this.settings.sliders[key].value = this.settings.sliders[key].default;
            });
        },
        allSlidersDefault() {
            return Object.keys(this.settings.sliders).every(key => this.settings.sliders[key].value === this.settings.sliders[key].default);
        },
        formatViewCount(viewCount) {
            let formattedCount = viewCount;

            if (this.settings.checkboxes.showViewCountComma.value) {
                formattedCount = formattedCount.toLocaleString(); // avec virgules
            }

            if (this.settings.checkboxes.showSimplifyViewCount.value) {
                formattedCount = simplifyNumber(formattedCount); // avec arrondissement
            }
            return formattedCount;
        },
        formatExportSize() {
            const node = document.querySelector('.youtube-card');
            const exportSizeSlider = this.settings.exportSize.value;
            const canvasWidth = Math.round(node.offsetWidth * exportSizeSlider);
            const canvasHeight = Math.round(node.offsetHeight * exportSizeSlider)
            this.settings.exportSize.value = parseFloat(this.settings.exportSize.value).toFixed(2);
            this.exportSizeText = `Export size: ${canvasWidth}x${canvasHeight}px`;
        },
        resetExportSize() {
            this.settings.exportSize.value = this.settings.exportSize.default;
            this.formatExportSize();
        },
        init() {
            this.loadParams();
            this.formatExportSize();
            this.$watch('settings', () => {
                this.updateUrl(this.settings);
            });
        },
        loadParams() {
            const params = new URLSearchParams(window.location.search);

            // Charger les valeurs pour les sliders avec valeurs par défaut
            Object.keys(this.settings.sliders).forEach(key => {
                const slider = this.settings.sliders[key];
                const paramValue = params.get(key);
                this.settings.sliders[key].value = paramValue ? Number(paramValue) : slider.default || slider.min;
            });

            // Charger les valeurs pour les checkboxes avec valeurs par défaut
            Object.keys(this.settings.checkboxes).forEach(key => {
                const checkbox = this.settings.checkboxes[key];
                const paramValue = params.get(key);
                this.settings.checkboxes[key].value = paramValue !== null ? paramValue === '1' : checkbox.value;
            });
            this.videoUrl = params.get('video_url') || 'https://www.youtube.com/watch?v=LamjAFnybo0';
            this.settings.darkMode = params.get('dark_mode') === '1';
            this.settings.language = params.get('language') || 'en';
            this.settings.exportSize.value = params.get('export_size') || 1;
        },
        updateUrl() {
            const params = new URLSearchParams();
            Object.entries(this.settings.sliders).forEach(([key, param]) => {
                params.set(key, param.value.toString());
            });
            // Mettre à jour l'URL pour les checkboxes
            Object.entries(this.settings.checkboxes).forEach(([key, {value}]) => {
                params.set(key, value ? '1' : '0');
            });

            params.set('video_url', this.videoUrl);
            params.set('dark_mode', this.settings.darkMode ? '1' : '0');
            params.set('language', this.settings.language);
            params.set('export_size', this.settings.exportSize.value);

            window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
        },
    }));
});