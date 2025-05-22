function openNav() {
    document.getElementById("myNav").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
}

function closeNav() {
    document.getElementById("myNav").style.width = "0";
    document.getElementById("main").style.marginLeft = "0";
}
function logout(){
    localStorage.removeItem("id"); // or localStorage.removeItem("token");

    // Optionally, you can also clear other session data if needed

    // Redirect the user to the login page
    window.location.href = "index.html"; // or wherever you want to redirect
};

function search(){
    const query = document.getElementById("searchValue").value.trim();
    if (!query) {
      alert("Please enter a search term");
      return;
    }
  
    // Redirect to search page with query in URL
    window.location.href = `search-result.html?q=${encodeURIComponent(query)}`;


}