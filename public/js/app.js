// Get the current URL
const currentURL = new URL(window.location.href);

// Identify the part of the path after the domain until the first '/'
const afterDomain = currentURL.pathname.split('/')[1];

// Base URL
let baseURL = "";

// Check if the part after the domain matches the service name
// If matches, then set that to the base URL
if (afterDomain === "oracle") {
    baseURL = `/${afterDomain}`;
}

// Get all links
const links = document.querySelectorAll('a');

// Regex that tests if URL is not external
const regex = new RegExp('^(http://|https://|ftp://|\/\/)');

// Iterate over each link and replace href if not external
links.forEach(link => {
    const originalHref = link.getAttribute('href');
    // Check if originalHref contains baseURL and is not external
    if (!originalHref.startsWith(baseURL) && !regex.test(originalHref)) {
        // Prepend baseURL to the original href only when it's not already there and not an external URL
        link.setAttribute('href', `${baseURL}${originalHref}`);
    }
});