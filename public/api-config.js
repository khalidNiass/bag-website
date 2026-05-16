window.HOTSHION_API_BASE = window.HOTSHION_API_BASE || (() => {
    const isLocal = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    const isRender = location.hostname.endsWith(".onrender.com");
    const renderBackendUrl = "https://bag-website-sfzx.onrender.com";

    if (isLocal && location.port !== "3000") {
        return `http://${location.hostname}:3000`;
    }

    if (isRender || location.port === "3000") {
        return "";
    }

    return renderBackendUrl;
})();
