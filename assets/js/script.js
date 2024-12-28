async function fetchToken() {
    const response = await fetch('/.netlify/functions/get-token');
    if (!response.ok) {
        throw new Error('Failed to fetch token');
    }
    const data = await response.json();
    return data.token;
}

async function fetchData() {
    const username = document.getElementById("username").value.trim();
    const card = document.getElementById("card");

    // Check if the username is provided
    if (!username) {
        alert("Please enter a GitHub username.");
        return;
    }

    card.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Generating your GitHub 2024 Wrapped... Please wait, this might take a minute or two. Grab a coffee or do a little dance!</p>
        </div>
    `;

    try {
        const GITHUB_TOKEN = await fetchToken();

        // Fetch user and repository data
        const userResponse = await fetch(`https://api.github.com/users/${username}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        if (!userResponse.ok) throw new Error("User not found");
        const userData = await userResponse.json();

        const reposResponse = await fetch(`https://api.github.com/users/${username}/repos`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        const reposData = await reposResponse.json();

        // Fetch language data for each repository
        const languageData = await fetchLanguageData(username, reposData, GITHUB_TOKEN);

        // Calculate key statistics
        const totalRepos = reposData.length;
        const publicRepos = reposData.filter(repo => !repo.private).length;
        const mostStarredRepo = reposData.reduce((max, repo) => 
            repo.stargazers_count > max.stargazers_count ? repo : max, 
            { stargazers_count: 0, name: 'No Repo' }
        );

        // Fetch commit activity data
        const commitActivity = await fetchCommitActivity(username, reposData);

        // Generate badges HTML
        const badgesHTML = generateBadges(reposData, userData);

        // After data is fetched, generate the graph and stats
        card.innerHTML = `
            <div class="github-wrapped-card">
                <div class="profile-section">
                    <img src="${userData.avatar_url}" alt="${userData.name}" class="profile-avatar" />
                    <div class="profile-info">
                        <h3>${userData.name || username}</h3>
                        <p>${userData.bio || "GitHub Explorer"}</p>
                        ${userData.blog ? `<a href="${userData.blog}" target="_blank">Blog</a>` : ''}
                    </div>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4>${totalRepos}</h4>
                        <p>Repositories</p>
                    </div>
                    <div class="stat-card">
                        <h4>${publicRepos}</h4>
                        <p>Public Repos</p>
                    </div>
                    <div class="stat-card">
                        <h4>${mostStarredRepo.stargazers_count}</h4>
                        <p>Top Stars</p>
                    </div>
                    <div class="stat-card">
                        <h4>${userData.followers}</h4>
                        <p>Followers</p>
                    </div>
                    <div class="stat-card">
                        <h4>${userData.following}</h4>
                        <p>Following</p>
                    </div>
                </div>
                <div class="commit-graph">
                    <h4>Commit Activity in 2024</h4>
                    <canvas id="commitGraph"></canvas>
                </div>
                <div class="language-graph">
                    <h4>Top Languages in 2024</h4>
                    <div id="languageIcons">${generateLanguageIcons(languageData)}</div>
                </div>
                <div class="badges-section">
                    <h4>Achievement Badges</h4>
                    <div class="badges-grid">
                        ${badgesHTML}
                    </div>
                </div>
                <div class="watermark">GitHub 2024 Wrapped</div>
                <button class="share-btn" onclick="shareWrapped()">Share</button>
                <button class="share-btn" onclick="downloadWrapped()">Download</button>
            </div>
        `;

        // Smooth scroll to the card
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

        // Draw the commit graph
        drawCommitGraph(commitActivity);

    } catch (error) {
        card.innerHTML = `
            <div class="error-container">
                <p>Error fetching data. Please check username and try again.</p>
            </div>
        `;
    }
}

async function fetchLanguageData(username, reposData, token) {
    const languageData = {};

    for (const repo of reposData) {
        const response = await fetch(`https://api.github.com/repos/${username}/${repo.name}/languages`, {
            headers: {
                'Authorization': `token ${token}`
            }
        });
        const data = await response.json();

        for (const [language, bytes] of Object.entries(data)) {
            if (!languageData[language]) {
                languageData[language] = 0;
            }
            languageData[language] += bytes;
        }
    }

    return languageData;
}

function generateLanguageIcons(languageData) {
    const icons = {
        JavaScript: '<i class="fas fa-rocket"></i>',
        Python: '<i class="fas fa-snake"></i>',
        // Add more language icons as needed
    };

    const sortedLanguages = Object.entries(languageData).sort((a, b) => b[1] - a[1]);

    return sortedLanguages.map(([language]) => {
        return `<div class="language-icon">${icons[language] || language}</div>`;
    }).join('');
}

async function fetchCommitActivity(username, reposData) {
    const commitActivity = new Array(12).fill(0);

    // Fetch commits from all repositories
    for (const repo of reposData) {
        const GITHUB_TOKEN = await fetchToken();
        const commitsResponse = await fetch(`https://api.github.com/repos/${username}/${repo.name}/commits?per_page=100`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        const commitsData = await commitsResponse.json();

        commitsData.forEach(commit => {
            const commitDate = new Date(commit.commit.author.date);
            // Check if the commit is from the year 2024
            if (commitDate.getFullYear() === 2024) {
                const month = commitDate.getMonth(); // Get the month (0-11)
                commitActivity[month]++;
            }
        });
    }

    return commitActivity;
}

function drawCommitGraph(commitActivity) {
    const ctx = document.getElementById('commitGraph').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Commits',
                data: commitActivity,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function shareWrapped() {
    const card = document.querySelector(".github-wrapped-card");
    html2canvas(card).then(canvas => {
        canvas.toBlob(blob => {
            const file = new File([blob], "github-wrapped.png", { type: "image/png" });
            const filesArray = [file];
            if (navigator.canShare && navigator.canShare({ files: filesArray })) {
                navigator.share({
                    files: filesArray,
                    title: 'GitHub 2024 Wrapped',
                    text: 'Check out my GitHub 2024 Wrapped!',
                    url: 'https://github-2024-recap.netlify.app/'
                });
            } else {
                alert('Your browser does not support sharing files.');
            }
        });
    });
}

function downloadWrapped() {
    const card = document.querySelector(".github-wrapped-card");
    const shareButtons = card.querySelectorAll(".share-btn");

    // Hide share and download buttons
    shareButtons.forEach(button => button.style.display = 'none');

    // Ensure the profile picture is loaded before capturing the card
    const profileImage = card.querySelector(".profile-avatar");
    if (profileImage.complete) {
        captureCard(card, shareButtons);
    } else {
        profileImage.onload = () => captureCard(card, shareButtons);
    }
}

function captureCard(card, shareButtons) {
    html2canvas(card, { useCORS: true }).then(canvas => {
        // Show share and download buttons again
        shareButtons.forEach(button => button.style.display = 'block');

        const link = document.createElement('a');
        link.download = 'github-wrapped.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function changeCardColor() {
    const color = document.getElementById("colorSelector").value;
    const card = document.querySelector(".github-wrapped-card");
    const footer = document.querySelector("footer");
    if (card) {
        card.style.backgroundColor = color;
        if (color === "#ffffff") {
            card.classList.add("light-theme");
            footer.classList.add("light-theme");
        } else {
            card.classList.remove("light-theme");
            footer.classList.remove("light-theme");
        }
    }
}

function generateBadges(reposData, userData) {
    const badges = [
        {
            id: 'star-collector',
            title: 'Star Collector',
            icon: '<i class="fas fa-star"></i>',
            condition: reposData.some(repo => repo.stargazers_count >= 5),
            description: '5+ stars on a repository'
        },
        {
            id: 'open-source-hero',
            title: 'Open Source Hero',
            icon: '<i class="fas fa-code-branch"></i>',
            condition: reposData.some(repo => repo.forks_count >= 3),
            description: '3+ forks on a repository'
        },
        {
            id: 'popular-creator',
            title: 'Popular Creator',
            icon: '<i class="fas fa-users"></i>',
            condition: userData.followers >= 10,
            description: '10+ GitHub followers'
        }
    ];

    return badges.map(badge => `
        <div class="badge ${badge.condition ? 'unlocked' : 'locked'}">
            ${badge.icon}
            <h5 class="badge-title">${badge.title}</h5>
            <p class="badge-description">${badge.description}</p>
        </div>
    `).join('');
}
