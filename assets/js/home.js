// AJAX form submission for creating posts
document.addEventListener('DOMContentLoaded', function() {
    const newPostForm = document.getElementById('new-post-form');

    if (newPostForm) {
        newPostForm.addEventListener('submit', async function(e) {
            // Allow normal form submission for file uploads
            // AJAX can be implemented with FormData if needed
        });
    }
});

// AJAX for comments
document.addEventListener('DOMContentLoaded', function() {
    const commentForms = document.querySelectorAll('.comment-form');

    commentForms.forEach(function(form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);

            try {
                const response = await fetch('/comments/create', {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    // Reload the page to show the new comment
                    location.reload();
                } else {
                    alert('Error creating comment');
                }
            } catch (error) {
                console.error('Error:', error);
                // Fall back to normal form submission
                this.submit();
            }
        });
    });
});
