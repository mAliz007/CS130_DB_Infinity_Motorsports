

document.addEventListener("DOMContentLoaded",fetchNews);

async function fetchNews() {
    const apiKey = '91bdfa793f9249079d07b586b97bb393';
    const url= `https://newsapi.org/v2/everything?q=cars&language=en&apiKey=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        const newsContainer = document.getElementById("newsContainer");
        newsContainer.innerHTML = "";

        data.articles.slice(0,6).forEach(article => {
            const newsCard = document.createElement("div");
            newsCard.classList.add("news-card");

            newsCard.innerHTML = `
            <img src="${article.urlToImage || 'default-image.jpg'}" alt="News Image">
                <h3>${article.title}</h3>
                <p>${article.description || "No description available."}</p>
                <a href="${article.url}" target="_blank">Read More</a>
                `
                newsContainer.appendChild(newsCard);
        })

            
        }catch(error){
            console.error("Error fetching news:", error);
            document.getElementById("newsContainer").innerHTML = "Error fetching news. Please try again later.";
        }
}