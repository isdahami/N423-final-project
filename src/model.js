import { firebaseConfig } from "./firebaseConfig";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  getDoc,
  collection,
  addDoc,
  getDocs,
  doc,
  where,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Add an event listener to detect changes in the authentication state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User is signed in

    // Fetch user information from Firestore using UID
    const usersCollection = collection(db, "Users");
    const userQuery = query(usersCollection, where("uid", "==", user.uid));
    const userSnapshot = await getDocs(userQuery);

    if (!userSnapshot.empty) {
      // User found in the collection
      const userData = userSnapshot.docs[0].data();
      updateUI(user, userData);
      // Call displayProfileData when user is signed in
      displayProfileData(user);
    } else {
      // User not found in the collection, handle it as needed
      console.log("User not found in the collection");
    }
  } else {
    // User is not signed in
    updateUI(null, null);
  }
});

async function displayProfileData(user) {
  if (user) {
    // Fetch user information from Firestore using UID
    const usersCollection = collection(db, "Users");
    const userQuery = query(usersCollection, where("uid", "==", user.uid));

    try {
      const userSnapshot = await getDocs(userQuery);

      console.log("User Snapshot:", userSnapshot.docs);

      if (!userSnapshot.empty) {
        // User data found in the collection
        const userData = userSnapshot.docs[0].data();
        updateProfilePage(userData);
      } else {
        // User data not found in the collection, handle it as needed
        console.log("User data not found in the collection");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  } else {
    // User not found in the collection, handle it as needed
    console.log("User not signed in");
  }
}
function updateProfilePage(userData) {
  const profileDisplayUser = document.querySelector(".profile-display-user");

  if (profileDisplayUser) {
    profileDisplayUser.innerHTML = `
      <div>
        <h3 class="profile-userName-txt">${userData.firstName}'s Profile</h3>
        <p><strong class="profile-strong">First Name:</strong> <span class="first-name">${userData.firstName}</span></p>
        <p><strong class="profile-strong">Last Name:</strong> <span class="last-name">${userData.lastName}</span></p>
        <p><strong class="profile-strong">Email:</strong> <span class="email">${userData.email}</span></p>
      </div>
      <button id="editInfoBtn">Edit Info</button>
      <button id="updateInfoBtn" style="display:none;">Update Info</button>
    `;

    // Add event listeners for the buttons
    const editInfoBtn = document.getElementById("editInfoBtn");
    const updateInfoBtn = document.getElementById("updateInfoBtn");

    editInfoBtn.addEventListener("click", () => {
      // Enable form fields for editing
      enableEditFields();
    });

    updateInfoBtn.addEventListener("click", () => {
      // Call a function to update the user information in Firebase
      updateUserInfoInFirebase();
    });
  } else {
    console.error("Profile display user element not found");
  }
}

function enableEditFields() {
  // Enable input fields for editing
  const firstNameInput = document.querySelector(".first-name");
  const lastNameInput = document.querySelector(".last-name");

  // Assuming you have input fields with the class "edit-field"
  firstNameInput.innerHTML = `<input type="text" class="edit-field" value="${firstNameInput.textContent}">`;
  lastNameInput.innerHTML = `<input type="text" class="edit-field" value="${lastNameInput.textContent}">`;

  // Show the "Update Info" button
  document.getElementById("updateInfoBtn").style.display = "block";
}

function updateUserInfoInFirebase() {
  const firstNameInput = document.querySelector(".first-name input");
  const lastNameInput = document.querySelector(".last-name input");

  const newFirstName = firstNameInput.value;
  const newLastName = lastNameInput.value;

  // Assuming the user object is already available
  const user = auth.currentUser;

  // Update user information in Firestore
  const usersCollection = collection(db, "Users");
  const userQuery = query(usersCollection, where("uid", "==", user.uid));

  getDocs(userQuery)
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        const userDocRef = doc(usersCollection, docId);

        return updateDoc(userDocRef, {
          firstName: newFirstName,
          lastName: newLastName,
        });
      }
    })
    .then(() => {
      // Successfully updated user information
      console.log("User information updated successfully");
      // Refresh the profile page to display the updated information
      displayProfileData(user);
      Swal.fire({
        title: "Account Updated!",
        text: "Your account has been successfully updated.",
        icon: "success",
      });
    })
    .catch((error) => {
      // Handle errors
      console.error("Error updating user information:", error);
    });
}

// Function to update UI based on user authentication status and data
function updateUI(user, userData) {
  const userProfile = document.getElementById("userProfile");
  const userName = document.getElementById("userName");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginSignupLinks = document.getElementById("loginSignupLinks");
  const profileTab = document.getElementById("profileTab");

  if (user) {
    // User is signed in
    userProfile.style.display = "flex";
    userProfile.style.alignItems = "center";
    userProfile.style.justifyContent = "center";
    userName.textContent = userData.firstName;
    userName.style.display = "inline";
    logoutBtn.addEventListener("click", () => {
      // Handle user logout
      signOut(auth)
        .then(() => {
          Swal.fire({
            title: "Signed Out",
            text: "You have successfully signed out.",
            icon: "success",
          });
          changePage("home");
          userName.style.display = "none";
          // Redirect to the login page or perform any other necessary actions
        })
        .catch((error) => {
          console.error("Error signing out: ", error);
        });
    });
    loginSignupLinks.style.display = "none";

    // Show the "Profile" tab in the navigation
    profileTab.style.display = "inline";
  } else {
    // User is not signed in
    userProfile.style.display = "none";
    loginSignupLinks.style.display = "block";
    userName.style.display = "none";

    // Hide the "Profile" tab in the navigation
    profileTab.style.display = "none";
  }
}

function createUser() {
  $("#signUpBtn").on("click", async (e) => {
    // retrieve values
    let fName = $("#fNameC").val();
    let lName = $("#lNameC").val();
    let email = $("#emailC").val();
    let pw = $("#pwC").val();

    try {
      const userCredentials = await createUserWithEmailAndPassword(
        auth,
        email,
        pw
      );

      // Add user information to Firestore
      const usersCollection = collection(db, "Users");

      await addDoc(usersCollection, {
        uid: userCredentials.user.uid,
        firstName: fName,
        lastName: lName,
        email: email,
      });

      console.log("created ", userCredentials.user);

      Swal.fire({
        title: "Account Created",
        text: "Your account has been successfully created.",
        icon: "success",
      }).then(() => {
        changePage("home");
      });
    } catch (error) {
      console.log("error", error.message);
    }
  });
}

function loginUser() {
  $("#loginBtn").on("click", (e) => {
    let email = $("#emailL").val();
    let pw = $("#pwL").val();

    signInWithEmailAndPassword(auth, email, pw)
      .then((userCredentials) => {
        Swal.fire({
          title: "Logged In",
          text: "You have successfully logged in.",
          icon: "success",
        }).then(() => {
          changePage("home");
        });
        console.log("signed in", userCredentials.user);
        // could query database here to bring back users info
      })
      .catch((error) => {
        console.log("error", error.message);
      });
  });
}

const stateParks = [
  { name: "Pokagon State Park", x: 335, y: 30 },
  { name: "Indiana Dunes State Park", x: 110, y: 40 },
  { name: "Turkey Run State Park", x: 110, y: 280 },
  { name: "McCormick's Creek State Park", x: 150, y: 360 },
  { name: "Brown County State Park", x: 205, y: 380 },
  { name: "Clifty Falls State Park", x: 295, y: 440 },
  { name: "Shades State Park", x: 135, y: 270 },
  { name: "Fort Harrison State Park", x: 225, y: 280 },
  { name: "Lincoln State Park", x: 125, y: 520 },
  { name: "Ouabache State Park", x: 325, y: 165 },
  { name: "Chain O'Lakes State Park", x: 295, y: 80 },
  { name: "Mounds State Park", x: 265, y: 250 },
  { name: "Summit Lake State Park", x: 300, y: 265 },
  { name: "Whitewater Memorial State Park", x: 340, y: 310 },
  { name: "Spring Mill State Park", x: 190, y: 435 },
  { name: "Charlestown State Park", x: 270, y: 475 },
  { name: "Falls of the Ohio State Park", x: 250, y: 495 },
  { name: "O'Bannon Woods State Park", x: 200, y: 500 },
  { name: "Potato Creek State Park", x: 195, y: 50 },
  { name: "Prophetstown State Park", x: 145, y: 200 },
  { name: "Shakamak State Park", x: 95, y: 370 },
  { name: "Tippecanoe River State Park", x: 175, y: 115 },
  { name: "Versailles State Park", x: 310, y: 385 },
  { name: "White River State Park", x: 200, y: 300 },
];

function interactiveMap() {
  console.log("Interactive map function called");
  const mapContainer = $(".parks-hero-right-map");

  // Create custom markers for state parks
  stateParks.forEach(function (park) {
    const marker = $("<div class='state-park-marker'></div>").css({
      left: park.x,
      top: park.y,
    });

    const tooltip = $("<div class='tooltip'></div>")
      .html(park.name)
      .css({
        left: park.x,
        top: park.y + 30 + "px",
      });

    // Display tooltip on marker hover
    marker.on("mouseenter", function () {
      tooltip.css("display", "block");
    });

    marker.on("mouseleave", function () {
      tooltip.css("display", "none");
    });

    // Append marker and tooltip to the map container
    mapContainer.append(marker);
    mapContainer.append(tooltip);
  });
}

async function displayParkCards() {
  const querySnapshot = await getDocs(collection(db, "Parks"));
  console.log("fetched data from firestore");

  const parksContainer = document.getElementById("parks-display");

  querySnapshot.forEach((doc) => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("card");

    const imageElement = document.createElement("img");

    // Log the image URL to the console for debugging
    console.log("Image URL:", doc.data().parkImage);

    imageElement.src = doc.data().parkImage;
    imageElement.alt = "Park Image";
    cardDiv.appendChild(imageElement);

    cardDiv.innerHTML += `
      <div class="card-content">
        <h3>${doc.data().parkName}</h3>
        <p>${doc.data().parkLocation}</p>
        <a id="${doc.id}" href="#parksPage?${doc.id}" class="findMore-btn">
      Find out more
    </a>
      </div>
    `;

    parksContainer.appendChild(cardDiv);
  });
}

async function queryParkPageDisplay(parkId) {
  console.log("Received parkId:", parkId);
  // Use document.querySelector to get the DOM element
  let parksPage = document.querySelector(".parks-page-display");

  if (parksPage) {
    const parkRef = doc(db, "Parks", parkId);

    console.log("Firestore Document Reference:", parkRef);

    try {
      // Get the document snapshot
      const docSnapshot = await getDoc(parkRef);

      if (docSnapshot.exists()) {
        // If the park document exists, retrieve the data
        const parkData = docSnapshot.data();

        // Create a park div element and apply styling
        const parkDiv = document.createElement("div");
        parkDiv.classList.add("parkDiv");

        const parkImgDiv = document.createElement("div");
        parkDiv.classList.add("parkImgDiv");

        // park img element
        const parkImgElement = document.createElement("img");
        parkImgElement.className = "parkImgElement";

        parkImgElement.src = parkData.parkImage;

        parkImgElement.alt = "Park Image";

        parkImgDiv.appendChild(parkImgElement);

        // Add park details to the park div
        parkDiv.innerHTML += `
          <span class="parkName">${parkData.parkName}</span>
          <span class="parkLocation">${parkData.parkLocation}</span>
          <span class="parkDesc">${parkData.parkDesc}</span>
          <button class="parkBtn"><a href="#reservation">Make a Reservation</a></button>
        `;

        // Append the park div to the parksPage container
        parksPage.appendChild(parkDiv);
        parksPage.appendChild(parkImgDiv);
      } else {
        // If the park document doesn't exist
        console.log("Park document not found");
      }
    } catch (error) {
      // Handle any errors that occur during the Firestore query
      console.error("Error querying Firestore:", error);
    }
  }
}

/*
 * It gets the pageId.html file and then puts the data into the app div
 * pageId - This is the id of the page that you want to change to.
 */
export function changePage(pageId, parkId) {
  console.log("model ", pageId);
  /* Using the jQuery get method to get the pageId.html file and then it is using the jQuery html
    method to put the data into the app div. */
  $.get(`pages/${pageId}.html`, function (data) {
    // Replace the content of the #app div with the data from the HTML file.
    $("#app").html(data);
    const mapContainer = $(".parks-hero-right-map");
    // Check if the map container exists before calling interactiveMap()
    if (mapContainer.length) {
      interactiveMap();
    }

    // If the pageId is "parksPage," you can use the parkId parameter as needed.
    if (pageId === "parksPage") {
      queryParkPageDisplay(parkId);
    }

    displayParkCards();
    queryParkPageDisplay();
    createUser();
    loginUser();
    displayProfileData(auth.currentUser);
    showSlides();
  })
    .done(function () {
      // Successfully loaded the HTML.
      console.log(`Successfully loaded ${pageId}.html`);
    })
    .fail(function (textStatus) {
      // Handle errors here.
      console.error(`Error loading ${pageId}.html: ${textStatus}`);
    });
}

// this function represents the images of slides on the home page
let slideIndex = 0;
function showSlides() {
  let i;
  // retrieve the elements from html
  let slides = document.getElementsByClassName("mySlides");
  let dots = document.getElementsByClassName("dot");

  /* The code snippet is part of the `showSlides` function. It is responsible for hiding all the slides
  except the current one. */
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  /* `slideIndex++;` is incrementing the value of `slideIndex` by 1. It is used to keep track of the
  current slide being displayed in the slideshow. */
  slideIndex++;
  /* is used to handle the case when the `slideIndex` exceeds the number of slides in the slideshow. */
  if (slideIndex > slides.length) {
    slideIndex = 1;
  }
  /* used to remove the "active" class from all the elements with the class name "dot". */
  for (i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" active", "");
  }
  slides[slideIndex - 1].style.display = "block";
  dots[slideIndex - 1].className += " active";
  setTimeout(showSlides, 5000);
}