import * as MODEL from "./model.js";

function route() {
  /* Getting the hash tag from the URL. */
  let hashTag = window.location.hash;
  /* Removing the hash tag from the URL. */
  let pageID = hashTag.replace("#", "");
  let parkID = pageID.split("?");

  console.log("page id ", pageID, "park id ", parkID);

  if (parkID[0] == "parksPage") {
    console.log("parksPage");
    pageID = parkID[0];
    parkID = parkID[1];
  }

  /* This is a conditional statement. If the pageID is empty, then the page will be changed to the home page. If the pageID is not empty, then the page will be changed to the pageID. */
  if (pageID == "") {
    MODEL.changePage("home");
  } else if (pageID == "parksPage") {
    // You will need to add a var in the changePage function to acount for the id of the park. Or store it in a global variable.
    MODEL.changePage(pageID, parkID);
  } else {
    MODEL.changePage(pageID);
  }
}

/*
 When the hamburger menu is clicked, toggle the class 'show' on the nav links.
*/
function toggleHamburgerMenu() {
  const $hamburgerMenu = $(".nav-ham-menu");
  const $navLinks = $(".nav-links");

  $hamburgerMenu.click(function () {
    $navLinks.toggleClass("show");
  });
}

function initListeners() {
  /* Listening for a change in the hash tag. */
  $(window).on("hashchange", route);

  /* Calling the route function. */
  route();
  toggleHamburgerMenu();
}

$(document).ready(function () {
  initListeners();
});
