jQuery(document).ready(function () {
  jQuery(".wp-megamenu > li > ul ").hover(function () {
    console.log(jQuery(this).parent().children()[0]);
    // jQuery('#wp-megamenu-item-4521 a').addClass('sub-menu-active');
    jQuery(jQuery(this).parent().children()[0]).addClass('sub-menu-active');
  }, function () {
    console.log('exitd');
    jQuery(jQuery(this).parent().children()[0]).removeClass('sub-menu-active');
  });


    // ===== Scroll to Top ==== 
  jQuery(window).scroll(function() {
    if (jQuery(this).scrollTop() >= 50) {        // If page is scrolled more than 50px
        jQuery('#return-to-top').fadeIn(200);    // Fade in the arrow
    } else {
        jQuery('#return-to-top').fadeOut(200);   // Else fade out the arrow
    }
  });
  jQuery('#return-to-top').click(function() {      // When arrow is clicked
    jQuery('body,html').animate({
        scrollTop : 0                       // Scroll to top of body
    }, 500);
  });
});

