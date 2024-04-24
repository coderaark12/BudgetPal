
function logger() {
    document.querySelector('.blur').style.filter = 'blur(5px)';
    document.body.style.overflow = 'hidden';
    document.querySelector('.blurtag').style.filter = 'blur(5px)';
    document.querySelector('.blurimg').style.filter = 'blur(5px)';
    document.querySelector('.blurbadal').style.filter = 'blur(5px)';
    const log = document.getElementsByClassName("logg")[0];
    log.innerHTML = `<div class="lpage">
    <div class="row">
        <h3 class="sign col-11">Sign up</h3>
        <span class="close-button col-1" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </span>
    </div>
    <form action="/signup" class="form" method="post">
        <div class="row">
            <div class="col-6">
                <input type="text" class="form-control inp" name="fname" placeholder="First Name">
            </div>
            <div class="col-6">
                <input type="text" class="form-control inp" name="lname" placeholder="Last Name">
            </div>
        </div>
        <div class="row rad">
            <div class="col-3">
                <input type="radio" class="form-check-input" id="male" name="gender" value="male" required>
                <label class="form-check-label al-acc" for="male">Male</label>
            </div>
            <div class="col-4">
                <input type="radio" class="form-check-input" id="female" name="gender" value="female" required>
                <label class="form-check-label al-acc" for="female">Female</label>
            </div>
        </div>
        <div class="row">
            <div class="col-6">
                <label class="form-check-label al-acc dt" for="date">Date Of Birth:</label>
            </div>
            <div class="col-6">
                <input type="date" class="inp form-control dob" id="date" name="DOB" required>
            </div>
        </div>
        <div class="row">
            <div class="col-8">
                <input type="email" placeholder="Email" class="form-control inp email" name="mail" required>
            </div>
        </div>
        <div class="row">
            <div class="col-8">
                <input type="password" class="form-control inp pass" name="Password" placeholder="Password" required>
            </div>
        </div>
        <div class="row">
            <div class="col">
                <input type="submit" class="form-control inp cr-acc" value="Create Account" required>
            </div>
        </div>
    </form>
    <form method="post" action="/login">
        <div>
            <span class="al-acc link-login">
                <input class="sub-al" type="submit" value="Already Have an Account? Login here">
            </span>
        </div>
    </form>
</div>
`


    document.getElementsByClassName("close-button")[0].addEventListener('click', () => {
        window.location.href = '/';
    });
    const badal = document.getElementsByClassName('badal')[0];
    badal.style.background = '#4CCD99';
    badal.style.margin = '0';
    badal.style.paddingLeft = '0%';
    badal.style.position = 'relative';
    badal.style.bottom = '300px';

}
