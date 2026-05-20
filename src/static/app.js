document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginToggleBtn = document.getElementById("login-toggle-btn");
  const loginForm = document.getElementById("login-form");
  const loginSubmitBtn = document.getElementById("login-submit-btn");
  const loginCancelBtn = document.getElementById("login-cancel-btn");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const loginMessage = document.getElementById("login-message");
  const userDisplay = document.getElementById("user-display");

  let currentLoggedInUser = null;

  // Toggle login form visibility
  loginToggleBtn.addEventListener("click", () => {
    if (currentLoggedInUser) {
      // Logout
      currentLoggedInUser = null;
      updateLoginUI();
      fetchActivities();
      return;
    }
    loginForm.classList.toggle("hidden");
    if (!loginForm.classList.contains("hidden")) {
      usernameInput.focus();
    }
  });

  // Cancel login
  loginCancelBtn.addEventListener("click", () => {
    loginForm.classList.add("hidden");
    usernameInput.value = "";
    passwordInput.value = "";
    loginMessage.innerHTML = "";
  });

  // Handle login
  loginSubmitBtn.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      loginMessage.textContent = "Please enter username and password";
      loginMessage.classList.add("error");
      return;
    }

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        currentLoggedInUser = username;
        loginMessage.textContent = "Login successful!";
        loginMessage.classList.remove("error");
        loginMessage.classList.add("success");
        
        // Update UI
        updateLoginUI();
        
        // Close login form after 1 second
        setTimeout(() => {
          loginForm.classList.add("hidden");
          usernameInput.value = "";
          passwordInput.value = "";
          loginMessage.innerHTML = "";
        }, 1000);

        // Refresh activities to show/hide delete buttons
        fetchActivities();
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.classList.add("error");
        loginMessage.classList.remove("success");
      }
    } catch (error) {
      loginMessage.textContent = "Error logging in. Please try again.";
      loginMessage.classList.add("error");
      console.error("Error:", error);
    }
  });

  // Update login UI based on logged-in status
  function updateLoginUI() {
    if (currentLoggedInUser) {
      userDisplay.textContent = `👨‍🏫 ${currentLoggedInUser} (logged in)`;
      userDisplay.classList.remove("hidden");
      loginToggleBtn.textContent = "🔓 Logout";
      
      // Show signup section for teachers
      document.getElementById("signup-container").style.display = "block";
    } else {
      userDisplay.classList.add("hidden");
      loginToggleBtn.textContent = "🔒 Login";
      
      // Hide signup section if not logged in
      document.getElementById("signup-container").style.display = "none";
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete buttons only for logged-in teachers
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li>
                        <span class="participant-email">${email}</span>
                        ${currentLoggedInUser ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    event.preventDefault();
    
    if (!currentLoggedInUser) {
      messageDiv.textContent = "You must be logged in as a teacher to unregister students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&teacher=${encodeURIComponent(currentLoggedInUser)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission (for teachers only)
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentLoggedInUser) {
      messageDiv.textContent = "You must be logged in as a teacher to register students";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&teacher=${encodeURIComponent(currentLoggedInUser)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateLoginUI();
  fetchActivities();
});
