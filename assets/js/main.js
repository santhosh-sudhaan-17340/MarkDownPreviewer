// Flash message auto-hide
document.addEventListener('DOMContentLoaded', function() {
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(function(message) {
        setTimeout(function() {
            message.style.animation = 'slideOut 0.3s ease-in-out';
            setTimeout(function() {
                message.remove();
            }, 300);
        }, 5000);
    });
});

// Slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Toggle comment form
function toggleCommentForm(postId) {
    const form = document.getElementById('comment-form-' + postId);
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

// Like functionality
document.addEventListener('DOMContentLoaded', function() {
    const likeButtons = document.querySelectorAll('.btn-like');

    likeButtons.forEach(function(button) {
        button.addEventListener('click', async function() {
            const postId = this.getAttribute('data-post-id');
            const type = this.getAttribute('data-type');

            try {
                const response = await fetch(`/likes/toggle/?id=${postId}&type=${type}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    // Toggle button appearance
                    const icon = this.querySelector('i');
                    if (data.data.deleted) {
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                        this.innerHTML = '<i class="far fa-thumbs-up"></i> Like';
                    } else {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                        this.innerHTML = '<i class="fas fa-thumbs-up"></i> Unlike';
                    }

                    // Reload to update count (optional - you can update it dynamically instead)
                    setTimeout(() => location.reload(), 500);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    });

    // Like comments
    const likeCommentButtons = document.querySelectorAll('.btn-like-comment');

    likeCommentButtons.forEach(function(button) {
        button.addEventListener('click', async function() {
            const commentId = this.getAttribute('data-comment-id');
            const type = this.getAttribute('data-type');

            try {
                const response = await fetch(`/likes/toggle/?id=${commentId}&type=${type}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const data = await response.json();

                if (response.ok) {
                    setTimeout(() => location.reload(), 500);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    });
});
