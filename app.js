document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const audioGrid = document.getElementById('audio-grid');
    const foldersGrid = document.getElementById('folders-grid');
    const breadcrumbContainer = document.getElementById('breadcrumb');
    const noResults = document.getElementById('no-results');
    const trackCount = document.getElementById('track-count');
    const currentViewTitle = document.getElementById('current-view-title');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const navHome = document.getElementById('nav-home');
    const navFavorites = document.getElementById('nav-favorites');
    const favCountBadge = document.getElementById('fav-count');
    const clearAllFiltersBtn = document.getElementById('clear-all-filters');
    const sortSelect = document.getElementById('sort-select');
    const btnViewToggle = document.getElementById('btn-view-toggle');
    const viewIcon = document.getElementById('view-icon');
    const toast = document.getElementById('toast');
    
    // Player Elements
    const mainAudio = document.getElementById('main-audio');
    const btnPlay = document.getElementById('btn-play');
    const btnPlayIcon = btnPlay.querySelector('i');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnShuffle = document.getElementById('btn-shuffle');
    const btnRepeat = document.getElementById('btn-repeat');
    const favPlayerBtn = document.getElementById('fav-player-btn');
    const nowPlayingBars = document.getElementById('now-playing-bars');
    
    const playerTitle = document.getElementById('player-title');
    const playerSubtitle = document.getElementById('player-subtitle');
    const playerThumb = document.getElementById('player-thumb');
    
    const progressBg = document.getElementById('progress-bg');
    const progressFill = document.getElementById('progress-fill');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    
    const volumeBg = document.getElementById('volume-bg');
    const volumeFill = document.getElementById('volume-fill');
    const muteIcon = document.getElementById('mute-icon');

    // Modal Elements
    const infoModal = document.getElementById('info-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const saveEditBtn = document.getElementById('save-edit');
    
    const editTitle = document.getElementById('edit-title');
    const editCharacter = document.getElementById('edit-character');
    const characterDatalist = document.getElementById('character-datalist');
    const editTagsContainer = document.getElementById('edit-tags-container');
    const customTagName = document.getElementById('custom-tag-name');
    const addCustomTagBtn = document.getElementById('add-custom-tag');

    // Filter Elements (now in sidebar)
    const resetFiltersBtn = document.getElementById('reset-filters');
    const charListContainer = document.getElementById('char-list');
    const chapterListContainer = document.getElementById('chapter-list');
    const versionListContainer = document.getElementById('version-list');
    
    // (Search filter inputs are handled directly in setupEventListeners)

    // Mobile Sidebar Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

    // Library List Element
    const gameList = document.getElementById('game-list');

    // State
    let currentLibrary = null; // Represents the selected Game
    let currentFolder = null;  // Represents the selected Chapter
    let currentTrackIndex = -1;
    let isEditingTrackId = null;
    let isPlaying = false;
    let isShuffle = false;
    let repeatMode = 'none'; // 'none' | 'one' | 'all'
    let isListView = false;
    let showingFavorites = false;
    let activeCharFilters = new Set();
    let activeChapterFilters = new Set();
    let activeVersionFilters = new Set();
    let filteredData = [];
    let favorites = new Set(JSON.parse(localStorage.getItem('hsrFavorites') || '[]'));
    
    // Preset Tag Templates
    const PRESET_TAGS = ['Battle', 'Ultimate', 'Idle', 'Voice', 'Normal Attack', 'Skill', 'Hit', 'Turn Begin', 'Turn End', 'Companion Mission', 'Story'];

    // --- Toast Notification ---
    let toastTimeout = null;
    function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.className = 'toast', 2500);
    }

    let hsrAudioData = [];

    // Initialize
    async function init() {
        try {
            const res = await fetch('/api/tracks');
            const data = await res.json();
            hsrAudioData = data;
        } catch (err) {
            console.error('Failed to fetch tracks from API:', err);
            audioGrid.innerHTML = '<div style="color:red; padding:20px;">Error loading tracks. Is the server running?</div>';
            return;
        }

        updateFavCount();
        populateCharFilters(true); // Full refresh on initial load
        applyFiltersAndRender();
        setupEventListeners();
    }

    // Helper to extract unique values
    function getUniqueValues(data, key) {
        const values = new Set(data.map(item => item[key]));
        return Array.from(values).sort();
    }

    const HSR_CHARACTERS = [
        'Caelus','Stelle','March 7th','Dan Heng','Himeko','Welt','Herta','Asta','Arlan','Kafka',
        'Silver Wolf','Blade','Seele','Bronya','Gepard','Serval','Natasha','Clara','Svarog','Sampo',
        'Pela','Hook','Luka','Lynx','Jing Yuan','Yanqing','Bailu','Tingyun','Sushang','Qingque',
        'Yukong','Luocha','Fu Xuan','Dan Heng • Imbibitor Lunae','Jingliu','Topaz','Numby',
        'Guinaifen','Huohuo','Hanya','Argenti','Ruan Mei','Xueyi','Dr. Ratio','Black Swan','Sparkle',
        'Misha','Gallagher','Aventurine','Acheron','Robin','Boothill','Firefly','Jade','Yunli',
        'Jiaoqiu','Feixiao','Lingsha','Moze','Rappa','Sunday','Fugue','The Herta','Aglaea','Tribbie',
        'Mydei','Anaxa','Castorice','Cipher','Hyacine','Phainon','Hysilens','Cerydra','Evernight',
        'Dan Heng • Permansor Terrae','Cyrene','The Dahlia','Yao Guang','Sparxie','Archer','Saber',
        'Akivili','Nanook','Lan','Nous','Xipe','IX','Qlipoth','Yaoshi','Aha','Mythus','Oroboros',
        'Long','Idrila','Fuli','Ena','Terminus','Tayzzyronth','HooH','Pom-Pom','Elio','SAM',
        'Dr. Primitive','Polka Kakamond','Screwllum','Stephen Lloyd','Cocolia Rand','Oleg','Baiheng',
        'Cirrus','Dan Shu','Hoolay','Huaiyan','Master Gongshu','Mok Tok','Phantylia','Tail','Taoran',
        'Asna','Clockie','Dominicus','Gopher Wood','Lancer','Skaracabaz','Doomsday Beast','Demetria',
        'Damionis',"Janus' Steed",'Chartonus','Akmonides','Ctesiphona','Kyros','Theodoros','Iason',
        'Shush','Chad','Nobody','Richie','Ligeia','Harrison','Haru','Prema','Mr. Arturo',
        'Professor Owl','Alphonse','Gabbana','Chaletka','Carmella','Su Meile','Fulin',
        'Northern Beggar','Skott','Randolph','Auslotte','A-Feng','A-Xing','A-Ying','Abraham',
        'Aceme','Acha','Aco','Adelyn','Adler','Adrian Spencer Smith','Aechenus','Aelenev','Aelius',
        'Agate','Agnes','Aide','Aideen','Aiden','Aitee','Akash','Aksay','Albus','Alexandra Rand',
        'Alexis','Alina','Alina Rand','Alisa Rand','Allen Jones','Alley','Almost-Fainted Employee',
        'Amunet','Arma','Artakama','Asat Pramad','Asika','Atticus','Attorney McGill','Audata','Aulus',
        'Aurumaton President','Avilius','Awei','Aymille','Bacchus',"Back'n",'Balakin',
        'Balaway the Miner\'s Lamp','Banxia','Bao Dating','Barlow','Baroumbrella','Barrie','Barrle',
        'Bartoli Miranda','Battuta','Beastar','Beatrice Prince','Beatriz','Bella','Benna','Benny',
        'Bernard','Bob','Bocchi','Bohdan','Bolaris','Boris','Boss Du','Boss Red','Boss Stone','Bova',
        'Boyang','Brina','Brona','Brutus','Bubbles','Burnie','Butler Oswell','Caenis','Caiyi',
        'Caldwick','Callinicus','Calypso','Cangxi','Capote','Carl','Carla','Cassondra','Caterina',
        'Celenova','Celine','Cerces','Chabro','Pearl','Irontomb','Nihilux','Lygus','Dunn','Wallace',
        'Julian','Mulu','Wen Tianweng','Xikui','Yancui','Ziqiao','Zhilu','Ruoyue','Xiaohan','Rocky',
        'Wen Shilin','Chengjie','Tianer','Yujin','Ferdinard','Nika','Geta','Goethe','Fidora','Gertie',
        'Eunice','Margot','Peak','Ross','Tammy','Taway','Vaska','Wanda','Williams','Woolsey',
        'Oti Alfalfa','Micah','Chadwick','Cocona','Lescot','Quinn','Lew Archer','Beryl','Forla',
        'Garcia','Qingzu','Dahao','Xiyan','Chiyan','Mengming','Guangda','Kang','Maocai',
        'NPC Male','NPC Female'
    ];

    function populateCharFilters(fullRefresh = false) {
        if (fullRefresh) {
            // Populate Library List
            const games = getUniqueValues(hsrAudioData, 'game');
            gameList.innerHTML = '';
            
            // Add "All Libraries" default option
            const allLi = document.createElement('li');
            allLi.innerHTML = `<i class="fa-solid fa-layer-group"></i> All Libraries`;
            allLi.className = 'active';
            allLi.addEventListener('click', () => {
                currentLibrary = null;
                currentFolder = null;
                activeCharFilters.clear();
                activeChapterFilters.clear();
                activeVersionFilters.clear();
                searchInput.value = '';
                updateLibraryActiveState(allLi);
                updateBreadcrumb();
                populateCharFilters(false); // repopulate filters for all games
                applyFiltersAndRender();
            });
            gameList.appendChild(allLi);

            games.forEach(game => {
                if (!game || game === 'Unknown') return;
                const li = document.createElement('li');
                li.innerHTML = `<i class="fa-solid fa-book"></i> ${game}`;
                li.addEventListener('click', () => {
                    currentLibrary = game;
                    currentFolder = null;
                    activeCharFilters.clear();
                    activeChapterFilters.clear();
                    activeVersionFilters.clear();
                    searchInput.value = '';
                    updateLibraryActiveState(li);
                    updateBreadcrumb();
                    populateCharFilters(false); // repopulate filters for this game
                    applyFiltersAndRender();
                });
                gameList.appendChild(li);
            });

            // Populate the datalist for the Info Modal character input mapping to all chars
            characterDatalist.innerHTML = '';
            HSR_CHARACTERS.forEach(char => {
                const option = document.createElement('option');
                option.value = char;
                characterDatalist.appendChild(option);
            });
        }
        
        let libraryData = hsrAudioData;
        if (currentLibrary) {
            libraryData = hsrAudioData.filter(item => item.game === currentLibrary);
        }

        // Determine unique characters from the current library
        const charsInLib = new Set(libraryData.map(t => t.character).filter(c => c && c !== 'Unknown' && c !== 'None'));
        // Sort based on predefined HSR_CHARACTERS order if possible, otherwise alphabetical
        const sortedChars = Array.from(charsInLib).sort((a,b) => {
            let idxA = HSR_CHARACTERS.indexOf(a);
            let idxB = HSR_CHARACTERS.indexOf(b);
            if(idxA === -1) idxA = 9999;
            if(idxB === -1) idxB = 9999;
            if(idxA === idxB) return a.localeCompare(b);
            return idxA - idxB;
        });
        createListItems(charListContainer, sortedChars, activeCharFilters);

        const chapters = getUniqueValues(libraryData, 'chapter');
        createListItems(chapterListContainer, chapters, activeChapterFilters);

        const versions = getUniqueValues(libraryData, 'version');
        createListItems(versionListContainer, versions, activeVersionFilters);
    }

    // Store list items for search filtering - keyed by container id
    const filterListData = {};

    function createListItems(container, items, activeSet) {
        container.innerHTML = '';
        const allLis = [];
        
        items.forEach(item => {
            if (!item || item === 'Unknown' || item === 'None') return;
            
            const li = document.createElement('li');
            li.textContent = item;
            if (activeSet.has(item)) li.classList.add('active');
            
            li.addEventListener('click', () => {
                if (activeSet.has(item)) {
                    activeSet.delete(item);
                    li.classList.remove('active');
                } else {
                    activeSet.add(item);
                    li.classList.add('active');
                }
                applyFiltersAndRender();
            });
            container.appendChild(li);
            allLis.push({ elem: li, text: item.toLowerCase() });
        });

        // Store reference for search filtering
        filterListData[container.id] = allLis;

        // Update the count badge
        const countBadge = container.parentElement.querySelector('.filter-count');
        if (countBadge) countBadge.textContent = allLis.length;
    }

    function filterListItems(containerId, term) {
        const allLis = filterListData[containerId] || [];
        const lower = term.toLowerCase();
        allLis.forEach(liObj => {
            liObj.elem.style.display = liObj.text.includes(lower) ? '' : 'none';
        });
    }

    // Lazy rendering variables for audio
    let currentRenderIndex = 0;
    const RENDER_BATCH_SIZE = 50;

    function updateLibraryActiveState(activeLi) {
        const lis = gameList.querySelectorAll('li');
        lis.forEach(li => li.classList.remove('active'));
        activeLi.classList.add('active');
        
        // Also remove active from Home/Fav if clicking a library
        document.getElementById('nav-home').classList.remove('active');
        document.getElementById('nav-favorites').classList.remove('active');
        showingFavorites = false;
    }

    function renderFolders() {
        foldersGrid.innerHTML = '';
        
        const fragment = document.createDocumentFragment();

        if (currentLibrary === null) {
            // Level 0: Show Game Folders
            const games = getUniqueValues(hsrAudioData, 'game');
            if (games.length === 0) {
                foldersGrid.classList.add('hidden');
                noResults.classList.remove('hidden');
                return;
            }

            games.forEach(game => {
                if (!game || game === 'Unknown') return;
                const gameCard = document.createElement('div');
                gameCard.className = 'game-card';
                const encodedGame = encodeURIComponent(game);
                let imgSrc = `https://dummyimage.com/600x337/181818/1db954.png&text=${encodedGame}`; // Default fallback
                if (game === 'Honkai Star Rail') {
                    imgSrc = './img/Honkai_Star_Rail_Folder.png';
                } else {
                    imgSrc = `./img/${encodedGame}.webp`; // Keep existing logic for other games
                }
                
                gameCard.innerHTML = `
                    <img src="${imgSrc}" class="game-card-bg" onerror="this.onerror=null; this.src='https://dummyimage.com/600x337/181818/1db954.png&text=${encodedGame}';">
                    <div class="game-card-content">
                        <h3>${game}</h3>
                    </div>
                `;
                gameCard.addEventListener('click', () => {
                    currentLibrary = game;
                    currentFolder = null;
                    activeCharFilters.clear();
                    activeChapterFilters.clear();
                    activeVersionFilters.clear();
                    searchInput.value = '';
                    const lis = gameList.querySelectorAll('li');
                    lis.forEach(li => {
                        if (li.textContent.includes(game)) updateLibraryActiveState(li);
                    });
                    populateCharFilters(false);
                    updateBreadcrumb();
                    applyFiltersAndRender();
                });
                fragment.appendChild(gameCard);
            });
            foldersGrid.appendChild(fragment);

        } else {
            // Level 1: Show Chapter Folders for the selected game
            let chaptersData = hsrAudioData.filter(item => item.game === currentLibrary);
            const allChapters = new Set(chaptersData.map(item => item.chapter));
            const sortedChapters = Array.from(allChapters).sort();

            if (sortedChapters.length === 0) {
                foldersGrid.classList.add('hidden');
                noResults.classList.remove('hidden');
                return;
            }

            sortedChapters.forEach(chapter => {
                const folderCard = document.createElement('div');
                folderCard.className = 'folder-card';
                
                // Attempt to load character thumbnail if chapter name matches
                const thumbName = chapter.split(' ')[0]; // E.g., if "Kafka Chapter", use "Kafka"
                const encodedThumb = encodeURIComponent(thumbName);
                
                folderCard.innerHTML = `
                    <img class="folder-thumb" src="./img/${encodedThumb}.webp" onerror="this.onerror=null; this.outerHTML='<i class=\\'fa-solid fa-folder\\'></i>';">
                    <h4 title="${chapter}">${chapter}</h4>
                `;
                folderCard.addEventListener('click', () => {
                    openFolder(chapter);
                });
                fragment.appendChild(folderCard);
            });
            foldersGrid.appendChild(fragment);
        }
    }

    function openFolder(folderName) {
        currentFolder = folderName;
        searchInput.value = '';
        updateBreadcrumb();
        applyFiltersAndRender();
    }

    function updateBreadcrumb() {
        breadcrumbContainer.innerHTML = '';
        
        // Root crumb
        const rootCrumb = document.createElement('span');
        rootCrumb.className = 'crumb' + (currentLibrary === null && currentFolder === null ? ' active' : '');
        rootCrumb.textContent = 'Home';
        rootCrumb.addEventListener('click', () => {
            currentLibrary = null;
            currentFolder = null;
            updateLibraryActiveState(gameList.querySelector('li')); // sets "All Libraries"
            updateBreadcrumb();
            applyFiltersAndRender();
        });
        breadcrumbContainer.appendChild(rootCrumb);

        if (currentLibrary !== null) {
            const separator = document.createElement('span');
            separator.className = 'separator';
            separator.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
            breadcrumbContainer.appendChild(separator);

            const libCrumb = document.createElement('span');
            libCrumb.className = 'crumb' + (currentFolder === null ? ' active' : '');
            libCrumb.textContent = currentLibrary;
            libCrumb.addEventListener('click', () => {
                currentFolder = null;
                updateBreadcrumb();
                applyFiltersAndRender();
            });
            breadcrumbContainer.appendChild(libCrumb);
        }

        if (currentFolder !== null) {
            const separator = document.createElement('span');
            separator.className = 'separator';
            separator.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
            breadcrumbContainer.appendChild(separator);

            const folderCrumb = document.createElement('span');
            folderCrumb.className = 'crumb active';
            folderCrumb.textContent = currentFolder;
            breadcrumbContainer.appendChild(folderCrumb);
        }
    }

    // --- Virtual Scrolling Observer ---
    let cardObserver = null;

    function initObserver() {
        if (cardObserver) cardObserver.disconnect();
        cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // If the stub enters the viewport (with a 300px margin)
                if (entry.isIntersecting) {
                    renderCardInner(entry.target);
                } else {
                    // Optional: clear out off-screen content to save max memory, 
                    // but usually just keeping them rendered after first view is fine unless it's 10,000+ items.
                    // For 800-2000 items, lazy-rendering on scroll down is enough to fix the initial load hang.
                }
            });
        }, { root: audioGrid.parentElement, rootMargin: '300px 0px' });
    }

    function renderCards(data) {
        audioGrid.innerHTML = '';
        if (data.length === 0) {
            audioGrid.classList.add('hidden');
            noResults.classList.remove('hidden');
            trackCount.textContent = '0 tracks';
            return;
        } 
        
        audioGrid.classList.remove('hidden');
        noResults.classList.add('hidden');
        trackCount.textContent = `${data.length} track${data.length !== 1 ? 's' : ''}`;
        
        initObserver();

        const fragment = document.createDocumentFragment();
        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'audio-card stub'; // 'stub' shows it hasn't loaded innerHTML yet
            if (currentTrackIndex !== -1 && hsrAudioData[currentTrackIndex].id === item.id) {
                card.classList.add('playing');
            }
            if (favorites.has(item.id)) {
                card.classList.add('favorited');
            }
            card.dataset.id = item.id;
            
            // Just attach listeners to the wrapper once
            card.addEventListener('click', (e) => {
                if (e.target.closest('.info-icon') || e.target.closest('.fav-btn')) return;
                playTrackById(item.id);
            });
            
            fragment.appendChild(card);
            cardObserver.observe(card);
        });
        
        audioGrid.appendChild(fragment);
    }

    function getCharacterImage(character) {
        if (!character || character === 'None' || character === 'Unknown') return null;
        // User stated img folder has character files; assuming .webp based on Kafka.webp
        return `./img/${character}.webp`;
    }

    // This fills in the actual HTML when the card scrolls into view

    function renderCardInner(card) {
        if (!card.classList.contains('stub')) return; // already rendered
        
        const id = card.dataset.id;
        const item = filteredData.find(t => t.id === id);
        if (!item) return;

        let displayTitle = item.title;
        if (displayTitle.length > 30) displayTitle = displayTitle.substring(0, 27) + '...';
        
        let characterTag = item.character && item.character !== 'Unknown' && item.character !== 'None' ? `<span class="tag">${item.character}</span>` : '';
        let tagsHtml = item.tags && item.tags.length > 0 ? item.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '';

        let thumbUrl = getCharacterImage(item.character) || item.thumbnailUrl || 'https://dummyimage.com/300x300/12141c/d9aa55.png&text=HSR';
        let hasCustomImg = !!getCharacterImage(item.character) || (item.thumbnailUrl && !item.thumbnailUrl.includes('dummyimage.com'));

        card.innerHTML = `
            <div class="info-icon" title="Edit Info">
                <i class="fa-solid fa-circle-info"></i>
            </div>
            <button class="fav-btn ${favorites.has(item.id) ? 'favorited' : ''}" title="Favorite (F)">
                <i class="fa-${favorites.has(item.id) ? 'solid' : 'regular'} fa-heart"></i>
            </button>
            <div class="card-img-container track-thumbnail">
                <img src="${thumbUrl}" onerror="this.onerror=null; this.src='https://dummyimage.com/300x300/12141c/d9aa55.png&text=HSR';" class="card-bg-img" alt="bg">
                <div class="card-icon-tile ${hasCustomImg ? 'has-bg' : ''}">
                    <i class="fa-solid fa-music"></i>
                </div>
                <div class="play-overlay">
                    <i class="fa-solid ${card.classList.contains('playing') && isPlaying ? 'fa-pause' : 'fa-play'}"></i>
                </div>
                <div class="now-playing-bars ${card.classList.contains('playing') && isPlaying ? 'active' : ''}" id="bars-${item.id}">
                    <span></span><span></span><span></span><span></span>
                </div>
            </div>
            <div class="card-info">
                <h4 title="${item.title}">${displayTitle}</h4>
                <p>${item.subtitle || ''}</p>
                <div class="card-tags">
                    ${characterTag}
                    ${tagsHtml}
                </div>
            </div>
        `;

        // Wire up inner buttons
        const infoBtn = card.querySelector('.info-icon');
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openInfoModal(item);
        });

        const favBtn = card.querySelector('.fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(item.id, card, favBtn);
        });

        card.classList.remove('stub'); // mark as rendered
    }



    function applyFiltersAndRender() {
        const searchTerm = searchInput.value; // keep raw case for secret check
        const searchLower = searchTerm.toLowerCase();
        
        // Toggle search-clear button visibility
        if(searchClear) searchClear.classList.toggle('hidden', !searchLower);

        const hasFilters = searchLower || activeCharFilters.size > 0 || activeChapterFilters.size > 0 || activeVersionFilters.size > 0 || showingFavorites;

        let data = hsrAudioData;
        if (showingFavorites) {
            data = hsrAudioData.filter(t => favorites.has(t.id));
        } else if (currentLibrary) { // Only apply library filter if not in favorites view unless wanted
            data = hsrAudioData.filter(t => t.game === currentLibrary);
        }

        if (hasFilters) {
            foldersGrid.classList.add('hidden');
            currentViewTitle.textContent = showingFavorites ? 'Favorites ❤️' : 'Search Results';
            trackCount.textContent = '';

            filteredData = data.filter(item => {
                let matchesSearch = true;
                if (searchLower) {
                    matchesSearch = (
                        item.title.toLowerCase().includes(searchLower) ||
                        (item.character && item.character.toLowerCase().includes(searchLower)) ||
                        (item.chapter && item.chapter.toLowerCase().includes(searchLower)) ||
                        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchLower)))
                    );
                }
                const matchesChar = activeCharFilters.size === 0 || activeCharFilters.has(item.character);
                const matchesChapter = activeChapterFilters.size === 0 || activeChapterFilters.has(item.chapter);
                const matchesVersion = activeVersionFilters.size === 0 || activeVersionFilters.has(item.version);

                return matchesSearch && matchesChar && matchesChapter && matchesVersion;
            });
            sortData(filteredData);
            renderCards(filteredData);
        } else if (currentFolder === null) {
            audioGrid.classList.add('hidden');
            noResults.classList.add('hidden');
            foldersGrid.classList.remove('hidden');
            currentViewTitle.textContent = currentLibrary ? currentLibrary : 'All Folders';
            trackCount.textContent = '';
            renderFolders();
            updateBreadcrumb();
        } else {
            foldersGrid.classList.add('hidden');
            currentViewTitle.textContent = currentFolder;
            filteredData = data.filter(item => item.chapter === currentFolder); // Uses data which already filters by currentLibrary
            sortData(filteredData);
            renderCards(filteredData);
        }
    }

    // Natural numeric sort: "Track 2" < "Track 10" < "Track 100"
    function naturalSort(a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    }

    function sortData(data) {
        const mode = sortSelect ? sortSelect.value : 'default';
        if (mode === 'title') {
            data.sort((a, b) => naturalSort(a.title, b.title));
        } else if (mode === 'title-desc') {
            data.sort((a, b) => naturalSort(b.title, a.title));
        } else if (mode === 'character') {
            data.sort((a, b) => naturalSort(a.character || '', b.character || ''));
        } else {
            // Default: sort numerically by title (1, 2, 3 ... 10, 11 ... 100)
            data.sort((a, b) => naturalSort(a.title, b.title));
        }
    }

    // --- Favorites ---
    function toggleFavorite(id, card, btn) {
        if (favorites.has(id)) {
            favorites.delete(id);
            if(card) card.classList.remove('favorited');
            if(btn) { btn.classList.remove('favorited'); btn.querySelector('i').className = 'fa-regular fa-heart'; }
            showToast('Removed from Favorites', 'info');
        } else {
            favorites.add(id);
            if(card) card.classList.add('favorited');
            if(btn) { btn.classList.add('favorited'); btn.querySelector('i').className = 'fa-solid fa-heart'; }
            showToast('Added to Favorites ❤️', 'success');
        }
        localStorage.setItem('hsrFavorites', JSON.stringify([...favorites]));
        updateFavCount();
        // Also update player heart button if this is the playing track
        if (currentTrackIndex !== -1 && hsrAudioData[currentTrackIndex].id === id) {
            updateFavPlayerBtn();
        }
    }

    function updateFavCount() {
        if(favCountBadge) favCountBadge.textContent = favorites.size;
    }

    function updateFavPlayerBtn() {
        if (!favPlayerBtn || currentTrackIndex === -1) return;
        const id = hsrAudioData[currentTrackIndex].id;
        const isFav = favorites.has(id);
        favPlayerBtn.classList.toggle('favorited', isFav);
        favPlayerBtn.querySelector('i').className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    }


    function setupEventListeners() {
        // Navigation 
        navHome.addEventListener('click', () => {
            showingFavorites = false;
            currentLibrary = null;
            currentFolder = null;
            activeCharFilters.clear();
            activeChapterFilters.clear();
            activeVersionFilters.clear();
            searchInput.value = '';
            navHome.classList.add('active');
            navFavorites.classList.remove('active');
            // Reset library list active state
            const firstLibLi = gameList.querySelector('li');
            if (firstLibLi) updateLibraryActiveState(firstLibLi);
            populateCharFilters(false);
            updateBreadcrumb();
            applyFiltersAndRender();
        });
        if(navFavorites) {
            navFavorites.addEventListener('click', () => {
                showingFavorites = true;
                currentFolder = null;
                navFavorites.classList.add('active');
                navHome.classList.remove('active');
                updateBreadcrumb();
                applyFiltersAndRender();
            });
        }

        // Search + clear
        searchInput.addEventListener('input', applyFiltersAndRender);
        if(searchClear) {
            searchClear.addEventListener('click', () => {
                searchInput.value = '';
                searchClear.classList.add('hidden');
                applyFiltersAndRender();
            });
        }

        // Clear all filters from no-results
        if(clearAllFiltersBtn) {
            clearAllFiltersBtn.addEventListener('click', () => {
                resetFilters();
            });
        }

        // Sort
        if(sortSelect) sortSelect.addEventListener('change', applyFiltersAndRender);

        // View Toggle
        if(btnViewToggle) {
            btnViewToggle.addEventListener('click', () => {
                isListView = !isListView;
                audioGrid.classList.toggle('list-view', isListView);
                viewIcon.className = isListView ? 'fa-solid fa-grip' : 'fa-solid fa-list';
                showToast(isListView ? 'List view' : 'Grid view');
            });
        }

        // Reset Filters
        if(resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', resetFilters);
        }

        function resetFilters() {
            activeCharFilters.clear();
            activeChapterFilters.clear();
            activeVersionFilters.clear();
            document.querySelectorAll('.filter-list li.active').forEach(c => c.classList.remove('active'));
            searchInput.value = '';
            if(searchClear) searchClear.classList.add('hidden');
            showingFavorites = false;
            navHome.classList.add('active');
            if(navFavorites) navFavorites.classList.remove('active');
            applyFiltersAndRender();
            showToast('Filters cleared');
        }

        // Collapsible filter accordion sections
        document.querySelectorAll('.filter-group-header').forEach(header => {
            header.addEventListener('click', () => {
                const group = header.parentElement;
                group.classList.toggle('collapsed');
            });
        });

        // Search filter inputs
        document.getElementById('search-char-filter').addEventListener('input', e => filterListItems('char-list', e.target.value));
        document.getElementById('search-chapter-filter').addEventListener('input', e => filterListItems('chapter-list', e.target.value));
        document.getElementById('search-version-filter').addEventListener('input', e => filterListItems('version-list', e.target.value));

        // Hamburger / Mobile sidebar
        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', () => {
                sidebar.classList.add('open');
                sidebarOverlay.classList.add('active');
            });
        }
        if (sidebarCloseBtn) {
            sidebarCloseBtn.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            });
        }
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            });
        }

        // Info Modal
        closeModalBtn.addEventListener('click', closeInfoModal);
        cancelEditBtn.addEventListener('click', closeInfoModal);
        saveEditBtn.addEventListener('click', saveTrackInfo);
        addCustomTagBtn.addEventListener('click', () => {
            const val = customTagName.value.trim();
            if (val) {
                renderModalTag(val, true);
                customTagName.value = '';
            }
        });
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) closeInfoModal();
        });

        // Player Controls
        btnPlay.addEventListener('click', togglePlayState);
        btnPrev.addEventListener('click', playPrevious);
        btnNext.addEventListener('click', playNext);

        // Shuffle & Repeat
        if(btnShuffle) {
            btnShuffle.addEventListener('click', () => {
                isShuffle = !isShuffle;
                btnShuffle.classList.toggle('active', isShuffle);
                showToast(isShuffle ? '🔀 Shuffle On' : 'Shuffle Off');
            });
        }
        if(btnRepeat) {
            btnRepeat.addEventListener('click', () => {
                repeatMode = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
                btnRepeat.classList.toggle('active', repeatMode !== 'none');
                const labels = { none: 'Repeat Off', all: '🔁 Repeat All', one: '🔂 Repeat One' };
                showToast(labels[repeatMode]);
                // Visual indicator for repeat one
                btnRepeat.querySelector('i').className = repeatMode === 'one' ? 'fa-solid fa-repeat' : 'fa-solid fa-repeat';
                btnRepeat.style.opacity = repeatMode === 'one' ? '1' : '';
            });
        }

        // Fav Player Btn
        if(favPlayerBtn) {
            favPlayerBtn.addEventListener('click', () => {
                if (currentTrackIndex === -1) return;
                const id = hsrAudioData[currentTrackIndex].id;
                // Find the card if visible
                const card = audioGrid.querySelector(`[data-id='${id}']`);
                const btn = card ? card.querySelector('.fav-btn') : null;
                toggleFavorite(id, card, btn);
            });
        }
        
        mainAudio.addEventListener('timeupdate', updateProgress);
        mainAudio.addEventListener('loadedmetadata', () => {
            timeTotal.textContent = formatTime(mainAudio.duration);
        });
        mainAudio.addEventListener('ended', () => {
            if (repeatMode === 'one') {
                mainAudio.currentTime = 0;
                mainAudio.play();
            } else {
                playNext();
                if (repeatMode === 'none' && currentTrackIndex === 0 && filteredData.length > 0) {
                    // Stopped
                }
            }
        });

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (infoModal && !infoModal.classList.contains('hidden')) return;
            switch(e.key) {
                case ' ': e.preventDefault(); togglePlayState(); break;
                case 'ArrowLeft': e.preventDefault(); playPrevious(); break;
                case 'ArrowRight': e.preventDefault(); playNext(); break;
                case 'f': case 'F':
                    if (currentTrackIndex !== -1) {
                        const id = hsrAudioData[currentTrackIndex].id;
                        const card = audioGrid.querySelector(`[data-id='${id}']`);
                        const btn = card ? card.querySelector('.fav-btn') : null;
                        toggleFavorite(id, card, btn);
                    }
                    break;
                case 's': case 'S':
                    isShuffle = !isShuffle;
                    if(btnShuffle) btnShuffle.classList.toggle('active', isShuffle);
                    showToast(isShuffle ? '🔀 Shuffle On' : 'Shuffle Off');
                    break;
                case 'r': case 'R':
                    repeatMode = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
                    if(btnRepeat) btnRepeat.classList.toggle('active', repeatMode !== 'none');
                    const rl = { none: 'Repeat Off', all: '🔁 Repeat All', one: '🔂 Repeat One' };
                    showToast(rl[repeatMode]);
                    break;
            }
        });

        // Progress Bar Click
        progressBg.addEventListener('click', (e) => {
            if (!mainAudio.src) return;
            const rect = progressBg.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            mainAudio.currentTime = percent * mainAudio.duration;
        });

        // Volume Click
        volumeBg.addEventListener('click', (e) => {
            const rect = volumeBg.getBoundingClientRect();
            let percent = (e.clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            mainAudio.volume = percent;
            volumeFill.style.width = `${percent * 100}%`;
            
            // Update icon
            if (percent === 0) muteIcon.className = 'fa-solid fa-volume-xmark';
            else if (percent < 0.5) muteIcon.className = 'fa-solid fa-volume-low';
            else muteIcon.className = 'fa-solid fa-volume-high';
        });

        // Mute toggle
        muteIcon.addEventListener('click', () => {
            if (mainAudio.volume > 0) {
                mainAudio.dataset.lastVol = mainAudio.volume;
                mainAudio.volume = 0;
                volumeFill.style.width = '0%';
                muteIcon.className = 'fa-solid fa-volume-xmark';
            } else {
                const vol = mainAudio.dataset.lastVol || 0.7;
                mainAudio.volume = vol;
                volumeFill.style.width = `${vol * 100}%`;
                muteIcon.className = 'fa-solid fa-volume-high';
            }
        });
    }

    // --- Audio Playback Logic ---

    function playTrackById(id) {
        const index = hsrAudioData.findIndex(item => item.id === id);
        if (index === -1) return;

        if (currentTrackIndex === index) {
            // Toggle play/pause if clicking the same track
            togglePlayState();
        } else {
            // Load and play new track
            currentTrackIndex = index;
            loadTrack(currentTrackIndex);
            mainAudio.play()
                .then(() => {
                    isPlaying = true;
                    updatePlayerUI();
                })
                .catch(err => console.error("Playback prevented", err));
        }
    }

    function loadTrack(index) {
        const track = hsrAudioData[index];
        mainAudio.pause();
        mainAudio.src = track.audioUrl;
        mainAudio.load();
        
        // Update Player UI
        playerTitle.textContent = track.title;
        playerSubtitle.textContent = `${track.character !== 'None' && track.character !== 'Unknown' ? track.character + ' · ' : ''}${track.subtitle}`;
        
        const mainThumbUrl = getCharacterImage(track.character) || track.thumbnailUrl || 'https://dummyimage.com/300x300/12141c/d9aa55.png&text=Audio';
        playerThumb.src = mainThumbUrl;
        playerThumb.onerror = function() {
            this.onerror = null;
            this.src = 'https://dummyimage.com/60x60/0b0e14/d9aa55.png&text=HSR';
        };

        updateFavPlayerBtn();
    }

    function togglePlayState() {
        if (currentTrackIndex === -1) {
            // Play first available track if nothing selected
            if (filteredData.length > 0) {
                playTrackById(filteredData[0].id);
            }
            return;
        }

        if (isPlaying) {
            mainAudio.pause();
            isPlaying = false;
        } else {
            mainAudio.play()
                .then(() => { isPlaying = true; updatePlayerUI(); })
                .catch(err => console.error(err));
        }
        updatePlayerUI();
    }

    function playNext() {
        if (currentTrackIndex === -1 && filteredData.length > 0) {
            playTrackById(filteredData[0].id);
            return;
        }
        
        if (isShuffle && filteredData.length > 1) {
            let randIndex;
            do { randIndex = Math.floor(Math.random() * filteredData.length); }
            while (filteredData[randIndex].id === hsrAudioData[currentTrackIndex].id);
            playTrackById(filteredData[randIndex].id);
            return;
        }

        const currentId = hsrAudioData[currentTrackIndex].id;
        const filteredIndex = filteredData.findIndex(item => item.id === currentId);
        
        if (filteredIndex !== -1 && filteredIndex < filteredData.length - 1) {
            playTrackById(filteredData[filteredIndex + 1].id);
        } else if (repeatMode === 'all' && filteredData.length > 0) {
            playTrackById(filteredData[0].id);
        }
    }

    function playPrevious() {
        if (currentTrackIndex === -1) return;
        
        // If track played past 3 seconds, previous just restarts it
        if (mainAudio.currentTime > 3) {
            mainAudio.currentTime = 0;
            return;
        }

        const currentId = hsrAudioData[currentTrackIndex].id;
        const filteredIndex = filteredData.findIndex(item => item.id === currentId);
        
        if (filteredIndex > 0) {
            playTrackById(filteredData[filteredIndex - 1].id);
        } else if (filteredData.length > 0) {
            // Go to end of filtered list
            playTrackById(filteredData[filteredData.length - 1].id);
        }
    }

    // Track which card was last marked as playing so we can clear it
    let lastPlayingCardEl = null;

    function updatePlayerUI() {
        // 1. Update the player bar play/pause button
        btnPlayIcon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';

        // 2. Update player bar now-playing bars
        if(nowPlayingBars) nowPlayingBars.classList.toggle('active', isPlaying);

        // 3. Clear all playing cards in the grid (handles re-renders)
        const oldPlayingCards = audioGrid.querySelectorAll('.playing');
        oldPlayingCards.forEach(card => {
            card.classList.remove('playing');
            const prevBars = card.querySelector('.now-playing-bars');
            if (prevBars) prevBars.classList.remove('active');
            const prevOverlay = card.querySelector('.play-overlay i');
            if (prevOverlay) prevOverlay.className = 'fa-solid fa-play';
        });

        // 4. Mark current playing card
        if (currentTrackIndex !== -1) {
            const id = hsrAudioData[currentTrackIndex].id;
            const cardEl = audioGrid.querySelector(`[data-id="${id}"]`);
            if (cardEl) {
                cardEl.classList.toggle('playing', true);
                const cardBars = cardEl.querySelector('.now-playing-bars');
                if (cardBars) cardBars.classList.toggle('active', isPlaying);
                const overlay = cardEl.querySelector('.play-overlay i');
                if (overlay) overlay.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
                lastPlayingCardEl = cardEl;
            }
        }
    }

    function updateProgress() {
        if (!mainAudio.duration) return;
        
        const percent = (mainAudio.currentTime / mainAudio.duration) * 100;
        progressFill.style.width = `${percent}%`;
        timeCurrent.textContent = formatTime(mainAudio.currentTime);
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // --- Modal Logic ---

    function renderModalTag(tagName, isSelected) {
        // Prevent duplicates in the UI
        const existingTags = Array.from(editTagsContainer.querySelectorAll('.modal-tag')).map(c => c.textContent.toLowerCase());
        if (existingTags.includes(tagName.toLowerCase())) return;

        const tag = document.createElement('div');
        tag.className = 'modal-tag';
        if (isSelected) tag.classList.add('selected');
        tag.textContent = tagName;
        
        tag.addEventListener('click', () => {
            tag.classList.toggle('selected');
        });
        
        editTagsContainer.appendChild(tag);
    }

    function openInfoModal(track) {
        isEditingTrackId = track.id;
        editTitle.value = track.title;
        editCharacter.value = track.character !== 'Unknown' && track.character !== 'None' ? track.character : '';
        
        // Tags Logic
        editTagsContainer.innerHTML = '';
        customTagName.value = '';
        
        let trackTags = Array.isArray(track.tags) ? track.tags : (typeof track.tags === 'string' ? track.tags.split(',') : []);
        trackTags = trackTags.map(t => t.trim().toLowerCase()).filter(t => t);

        // Render presets
        PRESET_TAGS.forEach(preset => {
            const isSelected = trackTags.includes(preset.toLowerCase());
            renderModalTag(preset, isSelected);
        });

        // Render any custom tags this track already has that aren't in presets
        trackTags.forEach(tTag => {
            const isPreset = PRESET_TAGS.some(p => p.toLowerCase() === tTag);
            if (!isPreset) {
                // Capitalize first letter strictly for display if not in presets
                const customPres = tTag.charAt(0).toUpperCase() + tTag.slice(1);
                renderModalTag(customPres, true);
            }
        });
        
        infoModal.classList.remove('hidden');
    }

    function closeInfoModal() {
        infoModal.classList.add('hidden');
        isEditingTrackId = null;
    }

    async function saveTrackInfo() {
        if (!isEditingTrackId) return;

        const updatedCharacter = editCharacter.value.trim() || 'Unknown';
        const selectedTags = Array.from(editTagsContainer.querySelectorAll('.modal-tag.selected'));
        const updatedTags = selectedTags.map(tag => tag.textContent.trim());

        const trackIdToSave = isEditingTrackId;
        closeInfoModal();

        try {
            const response = await fetch('/api/update-track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: trackIdToSave,
                    character: updatedCharacter,
                    tags: updatedTags
                })
            });

            const result = await response.json();
            if (result.success) {
                // Optimistic update
                const trackIndex = hsrAudioData.findIndex(t => t.id === trackIdToSave);
                if (trackIndex !== -1) {
                    hsrAudioData[trackIndex].character = updatedCharacter;
                    hsrAudioData[trackIndex].tags = updatedTags;
                    applyFiltersAndRender();
                }
                showToast('Track updated successfully', 'success');
            } else {
                showToast('Failed to update track.', 'error');
            }

        } catch (error) {
            console.error("Save error:", error);
            showToast('Network error — is the server running?', 'error');
        }
    }

    // Set initial volume
    mainAudio.volume = 0.7;
    
    // Start
    init();
});
