import { Vector2 } from "./thirdparty/three.module.js";

// Get all the UI elements by ID
const navigationForm = document.getElementById("navigation-form");
const mainContainer = document.getElementById("main-container");
const controlsContainer = document.getElementById("controls-container");
const descriptionContainer = document.getElementById("description-container")
const searchContainer = document.getElementById("search-container");

const viewControl = document.getElementById("view-control");
const floorControl = document.getElementById("floor-control");
const floorNumber = document.getElementById('floor-number');
const searchButton = document.getElementById("toggle-search-button");
const enterButton = document.getElementById("enter-button");
const buttonUp = document.getElementById("button-up");
const buttonDown = document.getElementById("button-down");
const greyCircle = document.getElementById("grey-circle");

const roomNameText = document.getElementById("room-name");
const roomDescription = document.getElementById("room-description");
const button360 = document.getElementById("threesixty-button");
const startRoom = document.getElementById("start-room");
const destinationRoom = document.getElementById("destination-room");

const wrapper = document.getElementById("wrapper");

const viewControlButton = document.getElementById("view-control-button");
const zentrierenButton = document.getElementById("zentrieren-button");
const dimensionsButton = document.getElementById("dimensions-button");

const infoPanel = document.getElementById("info-panel");
const infoPanelContent = document.getElementById("info-content");
const navbar = document.getElementById("my-navbar");
const infoButton = document.getElementById("info-button");
const infoCloseButton = document.getElementById("info-close-button");
const controlInstructionsDesktop = document.getElementById("tut-desktop");
const controlInstructionsMobile = document.getElementById("tut-mobile");

const slides = document.getElementsByClassName("slide");
const slideContainer = document.getElementById("slide-container");
const dots = document.getElementsByClassName("dot");

const logo = document.getElementById("logo");

const panoramaView = document.getElementById("panorama-viewer");
const panoramaCloseButton = document.getElementById("panorama-close-button");

const deleteStartInput = document.getElementById("delete-start-input");
const deleteDestinationInput = document.getElementById("delete-destination-input");

/**
 * If the distance between a mousedown and mouseup on the canvas is smaller than this value,
 * then the click will be interpreted as a pick event
 */
const MOUSE_PICK_MAX_SLIDE = 16;

class UIElements
{
    navigationFormVisible = false;
    infoPanelVisible = false;
    viewMenuVisible = false;
    describingRoom = false;
    slideAlreadyChanged = false;
    selectedLevel = 4;
    mouseMovedDistance = new Vector2();
    currentSlide = 0;
    swipeStartPoint = 0;
    lastSwipePoint = 0;
    describedRoomHasExtraView = false;

    constructor(papierfabrik)
    {
        this.papierfabrik = papierfabrik;
    }

    setupCallbacks()
    {
        window.addEventListener('resize', () =>
        {
            this.papierfabrik.resize();
            this.resizeSlides(false);
        });

        this.papierfabrik.canvas.onmousedown = (event) =>
        {
            this.mouseMovedDistance.set(event.clientX, event.clientY);
        }

        this.papierfabrik.canvas.onmouseup = (event) =>
        {
            const slide = this.mouseMovedDistance.sub(new Vector2(event.clientX, event.clientY)).length();

            if (slide < MOUSE_PICK_MAX_SLIDE)
            {
                this.papierfabrik.pick(event);
            }
        }

        navigationForm.onkeydown = (event) =>
        {
            if (event.key == 'Enter')
            {
                event.preventDefault();
                this.enterSearchform();
            }
        }

        deleteStartInput.onclick = (event) =>
        {
            startRoom.value = "";
            startRoom.focus();
            startRoom.select();
        }

        deleteDestinationInput.onclick = (event) =>
        {
            destinationRoom.value = "";
            destinationRoom.focus();
            destinationRoom.select();
        }

        enterButton.onclick = (event) =>
        {
            event.preventDefault();
            this.enterSearchform();
        }

        buttonUp.onclick = () =>
        {
            this.onPressUp();
        }

        buttonDown.onclick = () =>
        {
            this.onPressDown();
        }

        searchButton.onclick = (event) =>
        {
            this.toggleNavigationForm();
        }

        viewControlButton.onclick = (event) =>
        {
            this.toggleViewMenu();
        }

        zentrierenButton.onclick = (event) =>
        {
            this.papierfabrik.resetCamera();
        }

        infoPanel.ontouchstart = (event) =>
        {
            this.slideAlreadyChanged = false;
            this.swipeStartPoint = event.touches[0].clientX;
        }

        infoPanel.ontouchend = (event) =>
        {
            if (!this.slideAlreadyChanged)
            {
                this.swipeSlides(event.changedTouches[0].clientX);
            }
        }

        infoPanel.onmousedown = (event) =>
        {
            this.slideAlreadyChanged = false;
            this.swipeStartPoint = event.offsetX;
        }

        infoPanel.onmouseup = (event) =>
        {
            if (!this.slideAlreadyChanged)
            {
                this.swipeSlides(event.offsetX);
            }
        }

        dimensionsButton.onclick = (event) =>
        {
            if (this.papierfabrik.camera.type === 'PerspectiveCamera')
            {
                dimensionsButton.innerHTML = "3D";

                this.papierfabrik.initOrthogonalCamera();
            }
            else
            {
                dimensionsButton.innerHTML = "2D";

                this.papierfabrik.initPerspectiveCamera();
            }

            this.papierfabrik.updateCurrentLevel();
        }

        infoButton.onclick = (event) =>
        {
            this.toggleInfoPanel();
        }

        infoCloseButton.onclick = (event) =>
        {
            this.toggleInfoPanel();
        }

        panoramaCloseButton.onclick = (event) =>
        {
            this.hidePanoramaView();
        }

        dots[0].onclick = () => { this.showSlides(0) };
        dots[1].onclick = () => { this.showSlides(1) };
        dots[2].onclick = () => { this.showSlides(2) };
        dots[3].onclick = () => { this.showSlides(3) };
    }

    moveToConnectedLevel(object)
    {
        let level;
        if ((level = parseInt(object.parent.name[1])) !== NaN)
        {
            this.setSelectedLevel(level);

            this.papierfabrik.updateCurrentLevel();
        }
        else if ((level = parseInt(object.name[1])) !== NaN)
        {
            this.setSelectedLevel(level);

            this.papierfabrik.updateCurrentLevel();
        }
    }

    startSearch(searchInputField)
    {
        const foundNode = this.papierfabrik.search(searchInputField.value);

        if (foundNode)
        {
            this.moveToConnectedLevel(foundNode);

            this.papierfabrik.highlight(foundNode);
        }
        else
        {
            searchInputField.classList.add('form-error');
        }
    }

    startNavigation()
    {
        const startMesh = this.papierfabrik.search(startRoom.value);
        
        if (!startMesh)
        {
            startRoom.classList.add('form-error');

            console.error("Failed to find start room");

            return;
        }

        const destinationMesh = this.papierfabrik.search(destinationRoom.value);
        
        if (!destinationMesh)
        {
            destinationRoom.classList.add('form-error');

            console.error("Failed to find destination room");

            return;
        }

        if (startMesh == destinationMesh)
        {
            startRoom.classList.add('form-error');
            destinationRoom.classList.add('form-error');

            console.error("Start and Destionation can't be same room");

            return;
        }

        this.moveToConnectedLevel(startMesh);
        this.papierfabrik.startNavigation(startMesh, destinationMesh);
    }

    enterSearchform()
    {
        startRoom.classList.remove('form-error');
        destinationRoom.classList.remove('form-error');

        if (startRoom.value.length != 0)
        {
            if (destinationRoom.value.length != 0)
            {
                this.startNavigation();
            }
            else
            {
                this.startSearch(startRoom);
            }
        }
        else
        {
            if (destinationRoom.value.length != 0)
            {
                this.startSearch(destinationRoom);
            }
        }
    }

    onCancelNavigation()
    {
        this.papierfabrik.deleteNavigationLine();

        this.cancelNavigation();

        searchButton.onclick = (event) =>
        {
            this.toggleNavigationForm();
        }
    }

    setSelectedLevel(level)
    {
        this.selectedLevel = level;
        floorNumber.textContent = level;
    }

    onPressUp()
    {
        this.setSelectedLevel(Math.min(this.papierfabrik.level.length, this.selectedLevel + 1));

        this.papierfabrik.updateCurrentLevel();
    }

    onPressDown()
    {
        this.setSelectedLevel(Math.max(1, this.selectedLevel - 1));

        this.papierfabrik.updateCurrentLevel();
    }

    toggleNavigationForm()
    {
        if (this.navigationFormVisible)
        {
            greyCircle.style.display = "block";
            searchContainer.style.zIndex = "150";
            navigationForm.style.visibility = "hidden";
            controlsContainer.style.height = "50px";
            descriptionContainer.style.transform = "translateY(0)";
            controlsContainer.style.transform = "translateY(-20px)";

            viewControl.style.transform = "translateY(0)";
            searchButton.src = "svg/search.svg";
            enterButton.style.display = "none";
            floorControl.style.display = "flex";

            viewControl.style.display = "flex";
        }
        else
        {
            greyCircle.style.display = "none";
            searchContainer.style.zIndex = "180";
            navigationForm.style.visibility = "visible";
            controlsContainer.style.height = "110px";
            
            if (!this.describingRoom)
            {
                descriptionContainer.style.transform = "translateY(-45px)";
                controlsContainer.style.transform = "translateY(-62.5px)";
            }
            else
            {
                if (this.describedRoomHasExtraView)
                {
                    if (window.innerWidth > 500)
                    {
                        descriptionContainer.style.transform = "translateY(-15px)";
                        controlsContainer.style.transform = "translateY(-32.5px)";
                    }
                    else
                    {
                        descriptionContainer.style.transform = "translateY(-6px)";
                        controlsContainer.style.transform = "translateY(-24px)";
                    }
                }
                else
                {
                    if (window.innerWidth > 500)
                    {
                        descriptionContainer.style.transform = "translateY(-30px)";
                        controlsContainer.style.transform = "translateY(-47.5px)";
                    }
                    else
                    {
                        descriptionContainer.style.transform = "translateY(-18px)";
                        controlsContainer.style.transform = "translateY(-36px)";
                    }
                }
            }

            viewControl.style.transform = "translateY(25px)";
            searchButton.src = "svg/close.svg";
            enterButton.style.display = "block";
            floorControl.style.display = "none";

            viewControl.style.display = "none";
        }

        this.navigationFormVisible = !this.navigationFormVisible;
    }

    describeSelectedRoom(name, description, hasExtraView)
    {
        roomNameText.innerHTML = name;
        roomDescription.innerHTML = description;
        roomNameText.style.visibility = "visible";
        roomDescription.style.visibility = "visible";

        if (hasExtraView)
        {
            button360.style.visibility = "visible";

            if (window.innerWidth > 500)
            {
                mainContainer.style.transform = "translate(-50%, 25%)";
            }
            else
            {
                mainContainer.style.transform = "translate(-50%, 10%)";
            }

            if (this.navigationFormVisible)
            {
                if (window.innerWidth > 500)
                {
                    descriptionContainer.style.transform = "translateY(-15px)";
                    controlsContainer.style.transform = "translateY(-32.5px)";
                }
                else
                {
                    descriptionContainer.style.transform = "translateY(-6px)";
                    controlsContainer.style.transform = "translateY(-24px)";
                }
            }
            this.describedRoomHasExtraView = true;
        }
        else 
        {
            if (window.innerWidth > 500)
            {
                mainContainer.style.transform = "translate(-50%, 50%)";
            }
            else 
            {
                mainContainer.style.transform = "translate(-50%, 30%)";
            }

            if (this.navigationFormVisible)
            {
                if (window.innerWidth > 500)
                {
                    descriptionContainer.style.transform = "translateY(-30px)";
                    controlsContainer.style.transform = "translateY(-47.5px)";
                }
                else
                {
                    descriptionContainer.style.transform = "translateY(-18px)";
                    controlsContainer.style.transform = "translateY(-36px)";
                }
            }
            this.describedRoomHasExtraView = false;
        }

        this.describingRoom = true;
    }

    cancelDescribeSelectedRoom(name, description)
    {
        mainContainer.style.transform = "translate(-50%, 75%)";
        roomNameText.style.visibility = "hidden";
        roomDescription.style.visibility = "hidden";
        button360.style.visibility = "hidden";

        if (this.navigationFormVisible)
        {
            descriptionContainer.style.transform = "translateY(-45px)";
            controlsContainer.style.transform = "translateY(-62.5px)";
        }

        this.describingRoom = false;
        this.describedRoomHasExtraView = false;
    }

    describeNavigation(start, destination)
    {
        mainContainer.style.transform = "translate(-50%, 50%)";
        roomNameText.innerHTML = "Navigation";
        roomDescription.innerHTML = "von " + start + " nach " + destination;
        roomNameText.style.visibility = "visible";
        roomDescription.style.visibility = "visible";
        button360.style.visibility = "hidden";
        searchButton.src = "svg/close.svg";

        this.describingRoom = false;

        searchButton.onclick = (event) =>
        {
            event.preventDefault();
            this.onCancelNavigation();
        }
    }

    cancelNavigation()
    {
        mainContainer.style.transform = "translate(-50%, 75%)";
        roomNameText.style.visibility = "hidden";
        roomDescription.style.visibility = "hidden";
        searchButton.src = "svg/search.svg";
    }

    toggleViewMenu()
    {
        if (this.viewMenuVisible)
        {
            greyCircle.style.display = "block";
            viewControlButton.src = "svg/adjust.svg";
            zentrierenButton.style.display = "none";
            dimensionsButton.style.display = "none";
            viewControl.style.width = "auto";
            floorControl.style.display = "flex";
            searchButton.style.display = "block";
            searchContainer.style.display = "flex";
        }
        else
        {
            greyCircle.style.display = "none";
            viewControlButton.src = "svg/close.svg";
            floorControl.style.display = "none";
            searchButton.style.display = "none";
            viewControl.style.width = "100%";
            zentrierenButton.style.display = "block";
            dimensionsButton.style.display = "block";
            searchContainer.style.display = "none";
        }

        this.viewMenuVisible = !this.viewMenuVisible;
    }

    toggleInfoPanel()
    {
        if (this.infoPanelVisible)
        {
            logo.style.filter = "";
            infoPanel.style.height = "0";
            infoPanelContent.style.display = "none";
            mainContainer.style.display = "block";
            navbar.style.backgroundColor = "transparent";
            infoCloseButton.style.display = "none";
            infoButton.style.display = "block";
            infoCloseButton.style.display = "none";
        }
        else
        {
            logo.style.filter = "invert()";
            mainContainer.style.display = "none";
            infoPanel.style.height = "82.5vh";
            infoPanelContent.style.display = "flex";
            navbar.style.backgroundColor = "rgb(25, 97, 115)";
            infoButton.style.display = "none";
            infoCloseButton.style.display = "block";
            this.resizeSlides(true);
            this.showSlides(0)
        }

        this.infoPanelVisible = !this.infoPanelVisible;
    }

    // Used to detect a swipe and thus change tutorial slides
    swipeSlides(swipeEndPoint)
    {
        let mouseDistancePx = swipeEndPoint - this.swipeStartPoint;
        let mouseDistance = (mouseDistancePx / infoPanel.offsetWidth) * 100;
        
        if (mouseDistance < -MOUSE_PICK_MAX_SLIDE)
        {
            this.changeSlides(1);
            this.slideAlreadyChanged = true;
        }
        else if (mouseDistance > MOUSE_PICK_MAX_SLIDE)
        {
            this.changeSlides(-1);
            this.slideAlreadyChanged = true;
        }
    }

    resizeSlides(infoPanelCalled)
    {
        this.showControlInstructions();
        
        if (window.innerWidth >= 1368)
        {
            for (var i = 0; i < dots.length; i++)
            {
                dots[i].style.display = "none";
            }

            slideContainer.style.width = "100%";
            slideContainer.style.marginLeft = "0";
            slideContainer.style.justifyContent = "space-between";

            for (var i = 0; i < slides.length; i++)
            {
                slides[i].style.width = "24%";
                slides[i].style.opacity = "1";
            }
        }
        else
        {
            for (var i = 0; i < dots.length; i++)
            {
                dots[i].style.display = "inline-block";
            }

            dots[this.currentSlide].style.opacity = "1";

            slideContainer.style.width = "400%";
            slideContainer.style.justifyContent = "start";

            for (var i = 0; i < slides.length; i++)
            {
                slides[i].style.width = "100%";
                slides[i].style.opacity = "0";
            }

            slides[this.currentSlide].style.opacity = "1";

            let slideWidth = slides[this.currentSlide].offsetWidth;
            let leftSlidePoint = slideWidth * this.currentSlide;
            slideContainer.style.marginLeft = -leftSlidePoint + "px";
        }
    }

    changeSlides(direction)
    {
        const newSlide = this.currentSlide + direction;

        if (newSlide < 0 || newSlide >= slides.length)
        {
            return;
        }
        
        this.showSlides(newSlide);
    }

    showSlides(index)
    {
        // Don't work with slides when screen is big enough
        if (window.innerWidth >= 1368)
        {
            return;
        }

        if(index > slides.length - 1 || index < 0)
        {
            console.error("Index for Tutorial Slides is out of Bounds.");
            return;
        }

        this.currentSlide = index;

        // Set slide and dots opacity
        for (let i = 0; i < slides.length; i++)
        {
            slides[i].style.opacity = "0";
            dots[i].style.opacity = "0.5";
        }

        slides[this.currentSlide].style.opacity = "1";
        dots[this.currentSlide].style.opacity = "1";

        // Calculate and set margin to vertically scroll to current slide in SlideContainer
        let slideWidth = slides[this.currentSlide].offsetWidth;
        let leftSlidePoint = slideWidth * this.currentSlide;
        slideContainer.style.marginLeft = -leftSlidePoint + "px";
    }

    /** Set, wether instruction texts should be shown for mobile or desktop */
    showControlInstructions()
    {
        if (this.papierfabrik.isMobile)
        {
            controlInstructionsMobile.setAttribute("id", "tut-mobile-active");
        }
        else
        {
            controlInstructionsDesktop.setAttribute("id", "tut-desktop-active");
        }
    }

    showPanoramaView()
    {
        infoButton.style.display = "none";
        infoCloseButton.style.display = "none";
        panoramaView.style.display = "flex";
        panoramaCloseButton.style.display = "block";
    }

    hidePanoramaView()
    {
        panoramaCloseButton.style.display = "none";
        if (this.infoPanelVisible)
        {
            infoCloseButton.style.display = "block";
        }
        else
        {
            infoButton.style.display = "block";
        }
        panoramaView.style.display = "none";
    }
}

function resize()
{
    infoPanel.style.left = "50%";
    infoPanel.style.marginLeft = -document.getElementById("info-panel").clientWidth / 2 + "px";
    wrapper.style.left = "50%";
    wrapper.style.marginLeft = -document.getElementById("wrapper").clientWidth / 2 + "px";
}

window.onload = resize;
window.onresize = resize;

export { UIElements }