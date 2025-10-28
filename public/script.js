document.getElementById('colorButton').addEventListener('click', function() {
    const colors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#fd79a8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.style.backgroundColor = randomColor;
});

async function loadSpotifyData() {
    const spotifyPlayer = document.getElementById('spotify-player');
    spotifyPlayer.innerHTML = '<p>Connecting to Spotify...</p>';

    try {
        const response = await fetch("/api/spotify");
        const data = await response.json();

        if (!data.albums) {
            spotifyPlayer.innerHTML = '<p>No Spotify data available.</p>';
            return;
        }

        const tracks = data.albums.items.map(album => `
            <div class="album">
                <img src="${album.images[0].url}" alt="Album art">
                <h3>${album.name}</h3>
                <p>${album.artists.map(a => a.name).join(', ')}</p>
            </div>
        `).join("");

        spotifyPlayer.innerHTML = tracks;
    } catch (error) {
        spotifyPlayer.innerHTML = `<p style="color:red;">Error loading Spotify data.</p>`;
        console.error(error);
    }
}

loadSpotifyData();