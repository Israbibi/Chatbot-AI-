   // Audio management
        let introAudio = null;
        let isMuted = false;
        let audioInitialized = false;
        function initializeAudio() {
            if (audioInitialized) return;
            
            introAudio = document.getElementById('introAudio');
            if (!introAudio) return;
            introAudio.volume = 0.7;
            introAudio.addEventListener('play', function() {
                document.getElementById('muteButton').classList.add('active');
                document.getElementById('audioVisualizer').classList.add('active');
                document.getElementById('volumeIndicator').classList.add('show');
                setTimeout(() => {
                    document.getElementById('volumeIndicator').classList.remove('show');
                }, 2000);
            });
            
            introAudio.addEventListener('pause', function() {
                document.getElementById('muteButton').classList.remove('active');
                document.getElementById('audioVisualizer').classList.remove('active');
            });
            
            introAudio.addEventListener('ended', function() {
                document.getElementById('muteButton').classList.remove('active');
                document.getElementById('audioVisualizer').classList.remove('active');
            });
            
            introAudio.addEventListener('error', function(e) {
                console.log('Audio loading failed:', e);
                // Hide audio controls if audio fails to load
                document.querySelector('.audio-controls').style.display = 'none';
            });
            
            audioInitialized = true;
        }

        function playIntroAudio() {
            if (!introAudio || isMuted) return;
            
            introAudio.currentTime = 0;
            const playPromise = introAudio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Auto-play prevented:', error);
                    // Show a subtle notification that audio is available
                    showAudioNotification();
                });
            }
        }
        function showAudioNotification() {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                left: 30px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                padding: 10px 15px;
                border-radius: 25px;
                border: 1px solid var(--border);
                backdrop-filter: blur(10px);
                font-size: 14px;
                z-index: 1001;
                animation: slideIn 0.5s ease-out;
                cursor: pointer;
            `;
            notification.innerHTML = '🔊 Click to enable audio introduction';
            
            notification.addEventListener('click', () => {
                playIntroAudio();
                notification.remove();
            });
            
            document.body.appendChild(notification);
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 2000);
        }
        function toggleMute() {
            isMuted = !isMuted;
            const muteIcon = document.getElementById('muteIcon');
            const muteButton = document.getElementById('muteButton');
            
            if (isMuted) {
                muteIcon.textContent = '🔇';
                muteButton.title = 'Unmute';
                if (introAudio && !introAudio.paused) {
                    introAudio.pause();
                }
            } else {
                muteIcon.textContent = '🔊';
                muteButton.title = 'Mute';
                // If user unmutes, play the audio
                if (introAudio && introAudio.paused) {
                    playIntroAudio();
                }
            }
            localStorage.setItem('chatib-muted', isMuted);
        }
        function loadMutePreference() {
            const savedMute = localStorage.getItem('chatib-muted');
            if (savedMute === 'true') {
                isMuted = true;
                document.getElementById('muteIcon').textContent = '🔇';
                document.getElementById('muteButton').title = 'Unmute';
            }
        }

        // Theme management
        function setTheme(theme) {
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('chatib-theme', theme);
            document.querySelectorAll('.theme-option').forEach(option => {
                option.classList.remove('active');
            });
            document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
        }
        function loadTheme() {
            const savedTheme = localStorage.getItem('chatib-theme') || 'green';
            setTheme(savedTheme);
        }
        function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = window.innerWidth < 768 ? 25 : 50;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 8 + 's';
                particle.style.animationDuration = (Math.random() * 3 + 5) + 's';
                particlesContainer.appendChild(particle);
            }
        }
        document.addEventListener('DOMContentLoaded', function() {
            loadTheme();
            loadMutePreference();
            createParticles();
            initializeAudio();
            setTimeout(() => {
                playIntroAudio();
            }, 2000);
            document.getElementById('muteButton').addEventListener('click', toggleMute);
            document.querySelectorAll('.theme-option').forEach(option => {
                option.addEventListener('click', function() {
                    const theme = this.getAttribute('data-theme');
                    setTheme(theme);
                });
            });
            const ctaButton = document.querySelector('.cta-button');
            if (ctaButton) {
                ctaButton.addEventListener('click', function(e) {
                    this.style.transform = 'translateY(-3px) scale(0.98)';
                    setTimeout(() => {
                        this.style.transform = 'translateY(-3px) scale(1.05)';
                    }, 100);
                });
            }
            document.querySelectorAll('.feature').forEach(feature => {
                feature.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-8px) scale(1.02)';
                });
                
                feature.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) scale(1)';
                });
            });
            const enableAudioOnInteraction = () => {
                if (!isMuted && introAudio && introAudio.paused) {
                    playIntroAudio();
                }
                document.removeEventListener('click', enableAudioOnInteraction);
                document.removeEventListener('keydown', enableAudioOnInteraction);
            };

            document.addEventListener('click', enableAudioOnInteraction);
            document.addEventListener('keydown', enableAudioOnInteraction);
        });
        window.addEventListener('resize', function() {
            const particlesContainer = document.getElementById('particles');
            if (particlesContainer) {
                particlesContainer.innerHTML = '';
                createParticles();
            }
        });
        document.addEventListener('mousemove', function(e) {
            const videoContainer = document.querySelector('.video-container');
            if (!videoContainer) return;
            
            const rect = videoContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                const xPercent = (x / rect.width) * 100;
                const yPercent = (y / rect.height) * 100;
                
                videoContainer.style.background = `
                    radial-gradient(circle at ${xPercent}% ${yPercent}%, 
                    rgba(0, 255, 136, 0.1) 0%, 
                    rgba(0, 0, 0, 0.2) 50%)
                `;
            }
        });
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
