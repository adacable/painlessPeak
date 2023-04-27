console.log("initiated content_all.js");
function getImages() {
    standard = document.getElementsByTagName("img");
    //get images with style=background-image
    bg = document.querySelectorAll("[style*='background-image']");
    //join lists
    images = Array.prototype.slice.call(standard).concat(Array.prototype.slice.call(bg));
    return images;
}

filters = {
    "greyscale": {
    },
    "blur": {
    },
    "reveal": {
    },
    "hue-rotate": {
    },
    "letterbox": {
        "add": function(element, options) {
            //wrap image in outer
            var outer = element;
            image = element.querySelector("img");
            //create letterbox
            var letterbox = element.querySelector(".painlessPeek-filter");
            letterbox.classList.add('letterbox');
            //set iptions
            outer.addEventListener('mousemove', function(e) {
                moveLetterbox(e,letterbox,outer);
            });
        },
        "remove": function(element) {
            element.removeEventListener('mousemove', moveLetterbox);
            letterbox = element.querySelector(".painlessPeek-filter");
            letterbox.classList.remove('letterbox');
        }
    }
};
function moveLetterbox(e,letterbox,outer) {
    //make letterbox follow mouse if over image
    offset = outer.getBoundingClientRect();
    leftOffset = offset.left;
    topOffset = offset.top;
    boxWidth = outer.offsetWidth;
    boxHeight = outer.offsetHeight;
    //fix mouse in cenre
    xpos = e.clientX - leftOffset - (3*boxWidth / 2);
    ypos = e.clientY - topOffset - (3*boxHeight / 2);
    //move letterbox
    letterbox.style.left = xpos + 'px';
    letterbox.style.top = ypos + 'px';
}

function updateSelector(selector) {
    elements = getImages();
    wrappers = []
    elements.forEach((element) => {
        //check if wrapped by painlessPeek
        if (element.parentNode.classList.contains("painlessPeek-filter-wrapper")) {
            wrappers.push(element.parentNode);
        }else{
            wrapper = wrapElement(element);
            wrappers.push(wrapper);
        }
    });
    wrappers.forEach((wrapper) => {
        selector.filters.forEach((filterOpts) => {
            filterName = filterOpts["name"];
            opts = filterOpts["options"];
            filter = filters[filterName];
            updateFilter(wrapper, filterName, opts);
        })
    })
};

function wrapElement(element) {
    //wrap image in .painlessPeek-filter
    var wrapper = document.createElement('div');
    wrapper.classList.add('painlessPeek-filter-wrapper');
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    filtersDiv = document.createElement('div');
    filtersDiv.classList.add('painlessPeek-filter');
    wrapper.appendChild(filtersDiv);
    return wrapper;
}

function updateFilter(wrapper,filterName, options) {
    filter = filters[filterName];
    if (filter.update != undefined) {
        filter.update(wrapper, options);
    }else{
        filterDiv = wrapper.querySelector('.painlessPeek-filter');
        for (let [optionName, optionValue] of Object.entries(options)) {
            val = optionValue["value"];
            if (optionName == "enabled") {
                if (val == true) {
                    if (!(filterDiv.classList.contains(filterName))) {
                        addFilter(wrapper, filterName);
                    }
                }else{
                    if (filterDiv.classList.contains(filterName)) {
                        removeFilter(wrapper, filterName);
                    }
                }
            }else{
                filterDiv.setAttribute("data-" + optionName,val);
            }
        }
    }
}
function  addFilter(wrapper, filterName){
    filter = filters[filterName];
    console.log("adding filter: " + filterName);
    filterDiv = wrapper.querySelector('.painlessPeek-filter');
    if ('add' in filter) {
        filter.add(wrapper);
    }else{
        filterDiv.classList.add(filterName);
    }
}
function removeFilter(wrapper, filterName) {
    filter = filters[filterName];
    console.log("removing filter: " + filterName);
    filterDiv = wrapper.querySelector('.painlessPeek-filter');
    if ('remove' in filter) {
        filter.remove(wrapper);
    }else{
        filterDiv.classList.remove(filterName);
    }
}

function updateSelectors(newSelectors) {
    changedSelectors = [];
    prevSelectors = currentSelectors;
    newSelectors.forEach((newSelector) => {
        if (!(newSelector in prevSelectors)) {
            changedSelectors.push(newSelector);
        }       
    });
    if (changedSelectors.length != 0) {
        console.log("changed selectors: " + changedSelectors);
        console.log(newSelectors);
        changedSelectors.forEach((changedSelector) => {
            updateSelector(changedSelector);
        });
    }
    currentSelectors = newSelectors;
}

//run on selectors change
currentSelectors = {};
chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (key == "selectors") {
            updateSelectors(newValue);
        };
    };
    currentSelectors = selectors;
});
//run on new dom elements
function watchDom(){
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length != 0) {
                updateSelectors(currentSelectors);
            }
        });
    });
    observer.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    });
    console.log("oberver started");
}
//run on load
currentSelectors = {}
chrome.storage.sync.get("selectors").then((result) => {
    selectors = result.selectors;
    updateSelectors(selectors);
    watchDom();
});


//append css to page
var body = document.getElementsByTagName("body")[0];
var style = document.createElement('style');
style.type = 'text/css';
style.innerHTML = `
.painlessPeek-filter-wrapper{
    position: relative;
    overflow: hidden;
    max-width: 100%;
    width: fit-content;
    max-height: 100%;
    height: fit-content;
    }
.painlessPeek-filter{
    position: absolute;
    top: -100%;
    left: -100%;
    width: 300vh;
    height: 300vh;
    z-index:9999999999999;
    }
.painlessPeek-filter.greyscale{
    backdrop-filter: grayscale(100%);
    }
.painlessPeek-filter.blur {
    backdrop-filter: blur(20px);
    }
.painlessPeek-filter.blur.greyscale {
    backdrop-filter: blur(20px) grayscale(100%);
    }
.painlessPeek-filter.hue-rotate {
    backdrop-filter:hue-rotate(90deg);
    }
.painlessPeek-filter.letterbox{
    position: absolute;
    top: 0;
    left: 0;
    width:300%;
    height:300%;
    --rect-height: 5%;
    --rect-width: 5%;
    clip-path: polygon( evenodd,
    /* outer rect */
    0 0, /* top - left */
    100% 0, /* top - right */
    100% 100%, /* bottom - right */
    0% 100%, /* bottom - left */
    0 0, /* and top - left again */
    /* do the same with inner rect */
    /*y,x*/
    /*top left*/

    calc(50% - var(--rect-width)) calc(50% - var(--rect-height)),
    calc(50% + var(--rect-width)) calc(50% - var(--rect-height)),
    calc(50% + var(--rect-width)) calc(50% + var(--rect-height)),
    calc(50% - var(--rect-width)) calc(50% + var(--rect-height)),
    calc(50% - var(--rect-width)) calc(50% - var(--rect-height))
    );
}

.painlessPeek-filters.letterbox:hover{
    cursor: none;
}
.painlessPeek-filter.reveal{
    transition: backdrop-filter 5s;
}
.painlessPeek-filter.reveal:hover {
    backdrop-filter: none!important;
}

`


body.appendChild(style);
