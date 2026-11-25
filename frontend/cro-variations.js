window.croVariations = {
  hero_headline_test: {
    variant_a: function () {
      var heading = document.querySelector('.homepage .banner-title');
      if (heading) {
        heading.textContent = 'Headline changed first';
      }

      var ctaBtn = document.querySelector('.homepage a[href="#features"]');
      if (ctaBtn) {
        ctaBtn.textContent = 'Btn Text changed first';
        ctaBtn.style.backgroundColor = '#F64B39';
      }
    },
    variant_b: function () {
      var heading = document.querySelector('.homepage .banner-title');
      if (heading) {
        heading.textContent = 'Headline changed second';
      }

      var ctaBtn = document.querySelector('.homepage a[href="#features"]');
      if (ctaBtn) {
        ctaBtn.textContent = 'Btn Text changed second';
        ctaBtn.style.backgroundColor = '#F64B39';
      }
    }
  }
};
