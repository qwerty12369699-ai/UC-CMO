function validatePassword() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    const matchRequirement = document.getElementById('match');

    if (!password || !confirmPassword || !matchRequirement) {
        return true;
    }

    const pass = password.value || '';
    const confirm = confirmPassword.value || '';
    const isValid = pass === confirm && pass !== '';

    if (!isValid) {
        matchRequirement.innerHTML = `<i class="fas fa-exclamation-circle"></i> Passwords must match`;
        matchRequirement.classList.remove('valid');
    } else {
        matchRequirement.innerHTML = `<i class="fas fa-check-circle"></i> Passwords match`;
        matchRequirement.classList.add('valid');
    }

    return isValid;
}

function handleSignup(event) {
    if (!validatePassword()) {
        event.preventDefault();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    const form = document.getElementById('signupForm');

    if (password) {
        password.addEventListener('input', validatePassword);
    }

    if (confirmPassword) {
        confirmPassword.addEventListener('input', validatePassword);
    }

    if (form) {
        form.addEventListener('submit', handleSignup);
    }
});