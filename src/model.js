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
  deleteDoc,
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

async function createUser() {
  $("#signUpBtn").on("click", async (e) => {
    e.preventDefault();

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

async function loginUser() {
  $("#loginBtn").on("click", (e) => {
    e.preventDefault();

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

// ====================================================================

// ======================================================================
// Profile functions, displays users data and reservations
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

        // Call function to display reservation data
        displayReservationData(user.uid);
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
async function displayReservationData(uid) {
  const reservationsCollection = collection(db, "Reservations");
  const reservationQuery = query(
    reservationsCollection,
    where("uid", "==", uid)
  );

  try {
    const reservationSnapshot = await getDocs(reservationQuery);

    console.log("Reservation Snapshot:", reservationSnapshot.docs);

    if (!reservationSnapshot.empty) {
      // Reservations found for the user
      const reservationData = reservationSnapshot.docs.map((doc) => doc.data());
      updateReservationPage(reservationData);
    } else {
      // No reservations found for the user
      console.log("No reservations found for the user");
      updateReservationPage([]);
    }
  } catch (error) {
    console.error("Error fetching reservation data:", error);
  }
}

function updateReservationPage(reservationData) {
  const profileDisplayReservation = document.querySelector(
    ".profile-display-reservation"
  );

  if (profileDisplayReservation) {
    // Clear existing content
    profileDisplayReservation.innerHTML = "";

    if (reservationData.length > 0) {
      // User has reservations
      const reservationList = document.createElement("div");

      reservationData.forEach((reservation) => {
        const reservationItem = document.createElement("div");
        reservationItem.classList.add("profile-res-info");
        reservationItem.innerHTML = `
          <p class="res-first-name"><strong></strong> ${reservation.firstName}'s Reservation</p>
          <p class="park-name"><strong>Park:</strong> ${reservation.parkName}</p>
          <p class="resFirstName"><strong>Name:</strong> ${reservation.firstName} ${reservation.lastName}</p>
          <p><strong>Email:</strong> ${reservation.email}</p>
          <p class="res-date"><strong>Date:</strong> ${reservation.reservationDate}</p>
          <button class="edit-reservation-btn">Edit Info</button>
          <button class="update-reservation-btn" style="display:none;">Update Info</button>
          <button class="delete-reservation-btn">Delete</button>
        `;
        reservationList.appendChild(reservationItem);
      });

      profileDisplayReservation.appendChild(reservationList);

      // Add event listeners for "Edit" and "Update" buttons
      document.addEventListener("click", (event) => {
        const target = event.target;
        const reservationItem = target.closest(".profile-res-info");

        if (target.classList.contains("edit-reservation-btn")) {
          enableEditReservationFields(reservationItem);
        } else if (target.classList.contains("update-reservation-btn")) {
          updateReservationInFirebase(reservationItem);
        } else if (target.classList.contains("delete-reservation-btn")) {
          deleteReservationInFirebase(reservationItem);
        }
      });
    } else {
      // User has no reservations
      profileDisplayReservation.innerHTML = "User has no reservations.";
    }
  } else {
    console.error("Profile display reservation element not found");
  }
}

function enableEditReservationFields(reservationItem) {
  // Enable input fields for editing reservation

  const resDateInput = reservationItem.querySelector(".res-date");
  const parkNameInput = reservationItem.querySelector(".park-name");

  // Save the current values

  const currentDate = resDateInput.textContent.trim();
  const currentParkName = parkNameInput.textContent.trim();

  // Create input fields for editing

  resDateInput.innerHTML = `<input type="date" class="edit-field" value="${currentDate}">`;

  // Enable dropdown for editing park name
  const parkDropdown = document.createElement("select");

  // Populate the dropdown options
  parkDropdown.innerHTML = `
  <option value="Prophetstown">Prophetstown State Park</option>
  <option value="Mounds">Mounds State Park</option>
  <option value="Lincoln">Lincoln State Park</option>
  <option value="Versailles">Versailles State Park</option>
  <option value="Pokagon">Pokagon State Park</option>
  <option value="Indiana Dunes">Indiana Dunes State Park</option>
  <option value="Turkey Run">Turkey Run State Park</option>
  <option value="McCormicks Creek">McCormick's Creek State Park</option>
  <option value="Brown County">Brown County State Park</option>
  <option value="Clifty Falls">Clifty Falls State Park</option>
  <option value="Shades">Shades State Park</option>
  <option value="Fort Harrison">Fort Harrison State Park</option>
  <option value="Lincoln">Lincoln State Park</option>
  <option value="Ouabache">Ouabache State Park</option>
  <option value="ChainOLakes">Chain O'Lakes State Park</option>
  <option value="Mounds">Mounds State Park</option>
  <option value="Summit Lake">Summit Lake State Park</option>
  <option value="Whitewater Memorial">Whitewater Memorial State Park</option>
  <option value="SpringMill">Spring Mill State Park</option>
  <option value="Charlestown">Charlestown State Park</option>
  <option value="Falls Of The Ohio">Falls of the Ohio State Park</option>
  <option value="Obannon Woods">O'Bannon Woods State Park</option>
  <option value="Potato Creek">Potato Creek State Park</option>
  <option value="Shakamak">Shakamak State Park</option>
  <option value="Tippecanoe River">Tippecanoe River State Park</option>
  <option value="White River">White River State Park</option>
  `;

  // Set the selected option based on the current park name
  parkDropdown.value = currentParkName;

  // Replace the content with the dropdown
  parkNameInput.innerHTML = "";
  parkNameInput.appendChild(parkDropdown);

  // Show the "Update Info" button
  reservationItem.querySelector(".update-reservation-btn").style.display =
    "block";
}

function updateReservationInFirebase(reservationItem) {
  // Get the updated values from the input fields

  const updatedParkName =
    reservationItem.querySelector(".park-name select").value;
  const updatedDate = reservationItem.querySelector(".res-date input").value;

  // Update reservation information in Firestore
  const uid = auth.currentUser.uid;

  const reservationsCollection = collection(db, "Reservations");
  const reservationQuery = query(
    reservationsCollection,
    where("uid", "==", uid)
  );

  getDocs(reservationQuery)
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        const reservationRef = doc(reservationsCollection, docId);

        return updateDoc(reservationRef, {
          parkName: updatedParkName,
          reservationDate: updatedDate,
          // Update more fields as needed
        });
      }
    })
    .then(() => {
      // Handle success, e.g., show a confirmation message
      Swal.fire({
        title: "Reservation Updated",
        text: "Your reservation has been successfully updated.",
        icon: "success",
      });
      console.log("Reservation updated successfully");
      displayProfileData(auth.currentUser); // Refresh the profile page
    })
    .catch((error) => {
      // Handle errors, e.g., show an error message to the user
      console.error("Error updating reservation:", error);
    });
}

function deleteReservationInFirebase(reservationItem) {
  // Get the user UID from the authenticated user
  const userUid = auth.currentUser.uid;

  // Delete reservation document from Firestore based on user UID
  const reservationsCollection = collection(db, "Reservations");
  const reservationQuery = query(
    reservationsCollection,
    where("uid", "==", userUid)
  );

  // Assuming there's only one reservation per user, you can fetch and delete it directly
  getDocs(reservationQuery)
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        const reservationDoc = querySnapshot.docs[0];
        return deleteDoc(reservationDoc.ref);
      } else {
        console.log("No reservations found for the user");
      }
    })
    .then(() => {
      Swal.fire({
        title: "Reservation Deleted",
        text: "Your reservation has been successfully deleted.",
        icon: "success",
      });
      // Handle success, e.g., show a confirmation message
      console.log("Reservation deleted successfully");
      displayProfileData(auth.currentUser); // Refresh the profile page
    })
    .catch((error) => {
      // Handle errors, e.g., show an error message to the user
      console.error("Error deleting reservation:", error);
    });
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
      enableEditUserFields();
    });

    updateInfoBtn.addEventListener("click", () => {
      // Call a function to update the user information in Firebase
      updateUserInfoInFirebase();
    });
  } else {
    console.error("Profile display user element not found");
  }
}

function enableEditUserFields() {
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

function getUserReservationInfo() {
  $("#resBtn").on("click", (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    console.log("Reservation button clicked");

    // retrieve values
    let selectedPark = $("#stateParks").val();
    let firstName = $("#fNameR").val();
    let lastName = $("#lNameR").val();
    let email = $("#emailR").val();
    let reservationDate = $("#dateR").val();

    console.log("Selected Park:", selectedPark);
    console.log("First Name:", firstName);
    console.log("Last Name:", lastName);
    console.log("Email:", email);
    console.log("Reservation Date:", reservationDate);

    const reservationsCollection = collection(db, "Reservations");
    addDoc(reservationsCollection, {
      parkName: selectedPark,
      firstName: firstName,
      lastName: lastName,
      email: email,
      reservationDate: reservationDate,
      uid: auth.currentUser.uid,
    })
      .then(() => {
        // Handle success, e.g., show a confirmation message
        console.log("Reservation saved successfully");
        Swal.fire({
          title: "Reservation Complete!",
          text: "You have successfully made a reservation. You can view it under the profile page.",
          icon: "success",
        });
        changePage("home");
      })
      .catch((error) => {
        // Handle errors, e.g., show an error message to the user
        console.error("Error saving reservation:", error);
      });
  });
}
// ========================================================================

// ============================================================
// Review Functions

// Function to set up the event listener for review submissions
function setupReviewFormListener(parkId) {
  console.log("Setting up review form listener");

  // Event listener for the form submission
  $("#review-form").submit(function (e) {
    e.preventDefault();

    // Check if the user is signed in
    const user = auth.currentUser;
    if (!user) {
      // If not signed in, prompt the user to sign in
      Swal.fire({
        title: "Sign In Required",
        text: "You must be signed in to leave a review.",
        icon: "error",
      });
      changePage("login");
      return;
    }

    // Get values from the form
    const userEmail = $("#user-name").val();
    const userReview = $("#user-review").val();
    const selectedParkName = parkId;

    // Check if selectedParkName is defined
    if (selectedParkName) {
      const reviewsCollection = collection(db, "Reviews");

      addDoc(reviewsCollection, {
        userId: auth.currentUser.uid,
        parkId: selectedParkName,
        userEmail: userEmail,
        reviewText: userReview,
        status: "pending",
      })
        .then(() => {
          Swal.fire({
            title: "Review Successful",
            text: "Your review has been recieved!",
            icon: "success",
          });
          // Clear the form after successful submission
          const reviewForm = document.querySelector(
            ".write-review-section form"
          );
          reviewForm.reset();
        })
        .catch((error) => {
          console.error("Error submitting review:", error);
        });
    } else {
      console.error("Selected park is undefined");
    }
  });
}

// Function to display reviews
function displayReviews(parkId) {
  const reviewsDisplay = document.querySelector(".parks-review-display");

  // Retrieve reviews from Firestore for the specified park and status 'approved'
  const reviewsCollection = collection(db, "Reviews");
  const reviewsQuery = query(
    reviewsCollection,
    where("parkId", "==", parkId),
    where("status", "==", "approved")
  );

  getDocs(reviewsQuery)
    .then((querySnapshot) => {
      console.log("Number of approved reviews:", querySnapshot.size);
      querySnapshot.forEach((doc) => {
        const reviewData = doc.data();

        // Create HTML elements for each review
        const reviewCard = document.createElement("div");
        reviewCard.classList.add("review-card");

        const userName = document.createElement("span");
        userName.classList.add("user-name");
        userName.textContent = reviewData.userEmail; // Display user email for now

        const userReview = document.createElement("p");
        userReview.classList.add("user-review");
        userReview.textContent = reviewData.reviewText;

        // Append elements to the review card
        reviewCard.appendChild(userName);
        reviewCard.appendChild(userReview);

        // Append the review card to the display
        reviewsDisplay.appendChild(reviewCard);
      });
    })
    .catch((error) => {
      console.error("Error retrieving reviews:", error);
    });
}

// Function to fetch and display admin reviews
function fetchAndDisplayAdminReviews(parkId) {
  const reviewsContainer = $(".reviews-admin-display");

  // Fetch reviews from Firestore
  const reviewsCollection = collection(db, "Reviews");
  const reviewsQuery = query(
    reviewsCollection,
    where("status", "==", "pending")
  );

  getDocs(reviewsQuery)
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const reviewData = doc.data();

        // Create HTML elements for each review
        const reviewItem = $("<div>").addClass("review-item");

        // Add review data to the review item
        reviewItem.html(`
          <span class="user-name">${reviewData.userEmail}</span>
          <p class="park-user-review">${reviewData.reviewText}</p>
          <button class="approve-btn" data-review-id="${doc.id}">Approve</button>
          <button class="deny-btn" data-review-id="${doc.id}">Deny</button>
        `);

        // Append the review item to the container
        reviewsContainer.append(reviewItem);

        // Add event listeners to the newly created buttons
        reviewItem.find(".approve-btn").on("click", () => {
          approveReview(doc.id, parkId);
        });

        reviewItem.find(".deny-btn").on("click", () => {
          denyReview(doc.id);
        });
      });
    })
    .catch((error) => {
      console.error("Error retrieving reviews:", error);
    });
}

// Function to approve a review
async function approveReview(reviewId, parkId) {
  // Update the review status in Firestore
  const reviewRef = doc(db, "Reviews", reviewId);
  console.log("this is reviewId", reviewId);
  // Update the status to 'approved'
  updateDoc(reviewRef, {
    status: "approved",
  })
    .then(() => {
      Swal.fire({
        title: "Review Approved!",
        text: "The review has been approved and will now be public.",
        icon: "success",
      });
      // Display the review on the state park page for everyone
      displayReviews(parkId);
    })
    .catch((error) => {
      console.error("Error approving review:", error);
    });
}

// Function to deny a review
async function denyReview(reviewId) {
  try {
    // Delete the review from Firestore
    const reviewRef = doc(db, "Reviews", reviewId);
    await deleteDoc(reviewRef);

    // If denied, remove the corresponding review from the UI
    const reviewElement = $(`.review-item[data-review-id="${reviewId}"]`);
    reviewElement.remove();
    console.log(`Review ${reviewId} denied and deleted`);
    Swal.fire({
      title: "Review Denied",
      text: "The following review has been deleted.",
      icon: "success",
    });
    // After removing, fetch and display the updated admin reviews
    await fetchAndDisplayAdminReviews();
  } catch (error) {
    console.error("Error denying review:", error);
  }
}

// ==============================================

// Function to update UI based on user authentication status and data
function updateUI(user, userData) {
  const userProfile = document.getElementById("userProfile");
  const userName = document.getElementById("userName");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginSignupLinks = document.getElementById("loginSignupLinks");
  const profileTab = document.getElementById("profileTab");
  const reviewsTab = document.getElementById("reviewsTab");
  const reviews = document.getElementById("reviews");

  if (user) {
    // User is signed in
    userProfile.style.display = "flex";
    userProfile.style.alignItems = "center";
    userProfile.style.justifyContent = "center";
    userName.textContent = userData.firstName;
    userName.style.display = "inline";

    // Check if the user is an admin
    if (userData.role === "Admin") {
      // Show the "Review" tab in the navigation
      reviewsTab.style.display = "inline";
      userProfile.style.display = "none";
    } else {
      // Hide the "Review" tab in the navigation
      reviewsTab.style.display = "none";
    }

    logoutBtn.style.display = "inline"; // Display the logout button

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

    // Hide the "Review" tab in the navigation
    reviewsTab.style.display = "none";

    logoutBtn.style.display = "none"; // Hide the logout button
  }
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
      window.scrollTo(0, 0);
      queryParkPageDisplay(parkId);
      // Pass the parkId to setupReviewFormListener
      setupReviewFormListener(parkId);

      displayReviews(parkId);
    }
    if (pageId === "login") {
      loginUser();
    }
    if (pageId === "signup") {
      createUser();
    }
    if (pageId === "home") {
      showSlides();
    }
    if (pageId === "reviews") {
      fetchAndDisplayAdminReviews();
    }
    if (pageId === "reservation") {
      getUserReservationInfo();
    }
    setupSearchFunctionality();
    displayParkCards();
    displayProfileData(auth.currentUser);
    displayReviews();

    queryParkPageDisplay();
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

// Search functions
function setupSearchFunctionality() {
  const searchInput = document.getElementById(
    "../dist/pages/searchResults.html"
  );

  $("#searchButton").on("click", (e) => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    performSearch(searchTerm);
  });
  $("#searchInput").on("click", (e) => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    performSearch(searchTerm);
  });

  async function performSearch(searchTerm) {
    // Dynamically load the search results HTML
    try {
      const searchResultsHtml = await $.get("#searchResults");
      $("#app").append(searchResultsHtml);

      const searchResultsContainer = document.getElementById("searchResults");

      if (searchResultsContainer) {
        // Continue with the search logic...
        const parksCollection = collection(db, "Parks");
        const query = query(
          parksCollection,
          where("parkName", ">=", searchTerm)
        );
        const searchResults = await getDocs(query);

        // Process searchResults and update the UI
        displaySearchResults(searchResults);
      } else {
        console.error("searchResultsContainer not found");
      }
    } catch (error) {
      console.error("Error loading searchResults.html:", error);
    }
  }

  function displaySearchResults(results) {
    const searchResultsContainer = document.getElementById("searchResults");

    // Clear previous search results
    searchResultsContainer.innerHTML = "";

    if (results.size === 0) {
      // No matching results
      searchResultsContainer.innerHTML = "<p>No matching parks found.</p>";
    } else {
      // Iterate through the results and display them
      results.forEach((doc) => {
        const parkData = doc.data();
        const parkName = parkData.parkName;

        // Create a new element to display each result
        const resultElement = document.createElement("div");
        resultElement.innerHTML = `<p>${parkName}</p>`; //
        searchResultsContainer.appendChild(resultElement);
      });
    }
  }
}
