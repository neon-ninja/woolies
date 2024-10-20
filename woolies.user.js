// ==UserScript==
// @name         Woolies Price History Plot
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Fetch and display price history from CSV for Woolworths product pages.
// @updateURL      https://raw.githubusercontent.com/neon-ninja/woolies/refs/heads/main/woolies.user.js
// @downloadURL    https://raw.githubusercontent.com/neon-ninja/woolies/refs/heads/main/woolies.user.js
// @author       neonninja
// @match        https://www.woolworths.co.nz/shop/productdetails?stockcode=*
// @require      https://cdn.plot.ly/plotly-latest.min.js
// @require     https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Fetch CSV file
    const CSV_URL = 'https://raw.githubusercontent.com/neon-ninja/woolies/refs/heads/main/price_history.csv';

    // Helper to fetch CSV and parse it
    async function fetchCSV() {
        const response = await fetch(CSV_URL);
        const text = await response.text();
        return parseCSV(text);
    }

    // Helper to parse CSV data
    function parseCSV(data) {
        const lines = data.trim().split('\n');
        const headers = lines[0].split(',');
        const rows = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        });
        return rows;
    }

    // Extract SKU from the URL
    function getSKUFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('stockcode');
    }

    // Convert Unix timestamp to readable date
    function formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        return date;
    }

    // Render Plotly chart
    function renderChart(dates, prices) {
        const data = [{
            x: dates,
            y: prices,
            type: 'scatter',
            mode: 'lines+markers',
            marker: {color: 'blue'},
        }];

        const layout = {
            title: 'Price History',
            xaxis: { title: 'Date' },
            yaxis: { title: 'Price (NZD)' }
        };

        $("#chart").remove();
        $('p.product-description').prepend(`<div id="chart" style="width: 100%; height: 400px; margin-top: 20px;"></div>`);

        Plotly.newPlot($("#chart")[0], data, layout);
    }

    // Helper to wait for the product-details div to exist with observer cleanup
    function waitForElement(selector, callback) {
        const observer = new MutationObserver((mutations, me) => {
            const element = document.querySelector(selector);
            if (element) {
                me.disconnect(); // Stop observing once the element exists
                callback(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Detect URL change
    function detectUrlChange(callback) {
        let oldHref = window.location.href;

        // Intercept history methods (pushState and replaceState)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function () {
            originalPushState.apply(this, arguments);
            callback(); // Call when pushState is triggered
        };

        history.replaceState = function () {
            originalReplaceState.apply(this, arguments);
            callback(); // Call when replaceState is triggered
        };

        // Listen for popstate (back/forward buttons)
        window.addEventListener('popstate', callback);

        // Poll for URL changes (just in case)
        setInterval(() => {
            if (window.location.href !== oldHref) {
                oldHref = window.location.href;
                callback();
            }
        }, 500);
    }

    // Main function to fetch data and display chart
    async function main() {
        const sku = getSKUFromURL();
        if (!sku) {
            console.error('No SKU found in URL');
            return;
        }

        const priceHistory = await fetchCSV();
        console.log(priceHistory);
        const productData = priceHistory.filter(row => row.SKU === sku);

        if (productData.length === 0) {
            console.log('No price history found for this SKU.');
            return;
        }

        const dates = productData.map(row => formatDate(row.timestamp));
        const prices = productData.map(row => parseFloat(row.price));

        waitForElement('p.product-description', () => {
            renderChart(dates, prices);
        });
    }

    // Initialize and detect URL changes
    function initialize() {
        main(); // Run the main function when the page first loads
    }

    // Detect URL change and re-initialize when it happens
    detectUrlChange(() => {
        console.log('URL changed, re-initializing...');
        initialize();
    });

    // Run the initial script
    initialize();

})();
