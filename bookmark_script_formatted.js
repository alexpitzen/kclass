kclass = () => {
    fetch("https://raw.githubusercontent.com/alexpitzen/kclass/refs/heads/master/output_dynamic_scss.js")
        .then((response) => {
            response.text()
                .then((text) => {
                    if (!text) {
                        setTimeout(kclass, 2000);
                        return;
                    }
                    var script = document.createElement("script");
                    script.innerHTML = text;
                    script.type = "text/javascript";
                    document.body.appendChild(script);
                });
        });
};
kclass();
