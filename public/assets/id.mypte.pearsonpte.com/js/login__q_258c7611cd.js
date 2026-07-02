$(document).ready(function () {
    $("#icon_visibility").on("click", function () {
        $("#icon_visibility_off").show();
        $("#icon_visibility").hide();
        $("#inputPassword").attr("type", "password");
    }).hide();
    $("#icon_visibility_off").on("click", function () {
        $("#icon_visibility_off").hide();
        $("#icon_visibility").show();
        $("#inputPassword").attr("type", "text");
    });
    $("#inputPassword").on("blur", function () {
        $("#icon_visibility_off").show();
        $("#icon_visibility").hide();
        $("#inputPassword").attr("type", "password");
    });

    var hidePasswordTimer;
    $("#inputPassword").on("keyup", function () {
        clearTimeout(hidePasswordTimer);
        hidePasswordTimer = setTimeout(function () {
            $("#icon_visibility_off").show();
            $("#icon_visibility").hide();
            $("#inputPassword").attr("type", "password");
        }, 30000);
    });
    var length = $("#linkResetPassword").length;
    if (length) {
        $("#linkResetPassword").focus();
    }
    else {
        if ($("#inputUsername").val()) {
            $("#inputPassword").select();
        }
        else {
            $("#inputUsername").select();
        }
	}

    $("#pearsonLogo").on("click", function () { window.open("https://pearsonpte.com", "PearsonPTE"); });
    $("#mobilePearsonLogo").on("click", function () { window.open("https://pearsonpte.com", "PearsonPTE"); });
});