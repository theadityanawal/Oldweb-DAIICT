jQuery(document).ready(function () {
  jQuery('#urlSelect, .mobile-daiict-group-website').on('change', function () {
    if (this.value != "null") {
      window.open(this.value, '_blank');
    }
  })
})

function toggleFacultyData(id) {
  console.log(id);
  jQuery('#' + id).toggle(500);
}


/*$(function () { // same as (document).ready(function () {..})
  var slides = $(".carousel-inner .item"); // find the slides once

  // common next/prev function
  function changeSlide(direction) {
    var target,
        current = slides.filter(".active"); // find the current slide
    target = current[direction](); // call either .next() or .prev()
    if(target.length) { // if there is a next/prev slide...
     	current.removeClass();
      	target.addClass("item");
		target.addClass("active");
		target.fadeIn(3000);
    }
  }

  // add the handlers
  $(".carousel-control.right").on("click", function () { changeSlide('next') });
  $(".carousel-control.left").on("click", function () { changeSlide('prev') });
}); */