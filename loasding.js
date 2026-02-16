// 1. Lock the screen immediately when the script loads
document.body.style.overflow = "hidden";

// 2. This is the "Success" function 
// Your other file (shop.js) will call this only if the fetch works.
window.hideMyLoader = function() {
    const loader = document.getElementById("loader-wrapper");
    const loaderText = document.getElementById("loader-text");

    if (loader) {
        if (loaderText) loaderText.innerText = "Style Ready!";
        
        setTimeout(() => {
            loader.classList.add("loader-hidden");
            document.body.style.overflow = "auto"; // Unlock scrolling
            console.log("Internet Fetch Successful: Loader Hidden");
        }, 500);
    }
};

// 3. This is the "Fail" function
// Your other file (shop.js) will call this if the internet is down.
window.showLoaderError = function(message) {
    const loaderText = document.getElementById("loader-text");
    if (loaderText) {
        loaderText.innerText = message || "No Internet Connection";
        loaderText.style.color = "#ff4d4d"; // Turn text red
        
        // Add a "shake" effect to the text to grab attention
        loaderText.style.animation = "none"; // Reset animation
        loaderText.offsetHeight; // Trigger reflow
        loaderText.style.animation = "text-fade 1.5s ease-in-out infinite";
    }
};