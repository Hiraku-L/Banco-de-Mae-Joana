function isUserValid() {
    const user = form.user().value;
    if (!user) {
        return false;
    }
    return validateUser(user);
}