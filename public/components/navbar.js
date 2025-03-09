// Navbar component that can be reused across pages
class Navbar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        const currentPath = window.location.pathname;
        
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    font-family: Arial, sans-serif;
                }
                
                nav {
                    background-color: white;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    padding: 1rem;
                }
                
                .nav-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .brand {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: #4CAF50;
                    text-decoration: none;
                }
                
                .nav-links {
                    display: flex;
                    gap: 2rem;
                    align-items: center;
                }
                
                .nav-link {
                    text-decoration: none;
                    color: #666;
                    font-weight: 500;
                    padding: 0.5rem 1rem;
                    border-radius: 0.25rem;
                    transition: all 0.2s;
                }
                
                .nav-link:hover {
                    color: #4CAF50;
                    background-color: #f0f9f0;
                }
                
                .nav-link.active {
                    color: #4CAF50;
                    background-color: #f0f9f0;
                }
                
                .user-section {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .user-name {
                    color: #666;
                }
                
                .logout-btn {
                    background-color: #f44336;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 0.25rem;
                    cursor: pointer;
                    font-size: 0.875rem;
                }
                
                .logout-btn:hover {
                    background-color: #d32f2f;
                }
                
                @media (max-width: 768px) {
                    .nav-links {
                        display: none;
                    }
                    
                    .nav-links.show {
                        display: flex;
                        flex-direction: column;
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background-color: white;
                        padding: 1rem;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    
                    .menu-btn {
                        display: block;
                        background: none;
                        border: none;
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0.5rem;
                    }
                }
            </style>
            
            <nav>
                <div class="nav-container">
                    <a href="/" class="brand">Joberman</a>
                    
                    <button class="menu-btn" style="display: none;">☰</button>
                    
                    <div class="nav-links">
                        <a href="/upload.html" class="nav-link ${currentPath === '/upload.html' ? 'active' : ''}">Upload Resume</a>
                        <a href="/profile.html" class="nav-link ${currentPath === '/profile.html' ? 'active' : ''}">Profile</a>
                        <a href="/jobs.html" class="nav-link ${currentPath === '/jobs.html' ? 'active' : ''}">Jobs</a>
                        <a href="/chat.html" class="nav-link ${currentPath === '/chat.html' ? 'active' : ''}">Career Assistant</a>
                    </div>
                    
                    <div class="user-section">
                        <span class="user-name" id="userName"></span>
                        <div id="authButtons">
                            <a href="/login.html" class="nav-link" id="loginBtn" style="display: none;">Login</a>
                            <button class="logout-btn" id="logoutBtn" style="display: none;">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }

    setupEventListeners() {
        // Handle logout
        const logoutBtn = this.shadowRoot.getElementById('logoutBtn');
        const loginBtn = this.shadowRoot.getElementById('loginBtn');
        
        // Check if user is logged in
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
            logoutBtn.style.display = 'inline-block';
            loginBtn.style.display = 'none';
        } else {
            logoutBtn.style.display = 'none';
            loginBtn.style.display = 'inline-block';
        }
        
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/upload.html';
        });

        // Update user name
        const userName = this.shadowRoot.getElementById('userName');
        const storedUserName = localStorage.getItem('userName');
        if (storedUserName) {
            userName.textContent = storedUserName;
        }

        // Mobile menu toggle
        const menuBtn = this.shadowRoot.querySelector('.menu-btn');
        const navLinks = this.shadowRoot.querySelector('.nav-links');
        
        if (window.innerWidth <= 768) {
            menuBtn.style.display = 'block';
            menuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('show');
            });
        }
    }
}

customElements.define('nav-bar', Navbar); 