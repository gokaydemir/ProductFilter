let questions = [];
let currentStep = 0;
let currentCategory = null;
let answers = {};
let swiper = null;


fetch('/question.json')
    .then(response => response.json())
    .then(data => {
        questions = data;
        showQuestion(0);
        renderSteps();
    });


function showQuestion(step) {
    const questionSet = currentCategory ?
        questions.find(q => q.name === currentCategory) :
        questions[0];

    const question = questionSet.steps[step];
    document.getElementById('questionTitle').innerText = question.title;

    const optionsHtml = question.answers.map(answer =>
        `<div class="option" onclick="selectOption('${answer}')">${answer}</div>`
    ).join('');

    document.getElementById('options').innerHTML = optionsHtml;
    updateButtons();
    updateSteps();
}

function selectOption(answer) {
    const options = document.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));

    const selectedOption = Array.from(options).find(opt => opt.innerText === answer);
    selectedOption.classList.add('selected');

    const questionSet = questions.find(q => q.name === (currentCategory || answer));
    const currentQuestion = questionSet.steps[currentStep];
    answers[currentQuestion.type] = answer;

    if (currentStep === 0) {
        currentCategory = answer;
    }

    document.getElementById('nextBtn').disabled = false;
}

function nextStep() {
    const questionSet = questions.find(q => q.name === currentCategory);

    if (currentStep < questionSet.steps.length - 1) {
        currentStep++;
        showQuestion(currentStep);
    } else {

        fetch('/product.json')
            .then(response => response.json())
            .then(data => {
                const selectedPriceRange = answers.price;
                let minPrice = 0, maxPrice = Infinity;

                if (selectedPriceRange === "0-1000") {
                    minPrice = 0;
                    maxPrice = 1000;
                } else if (selectedPriceRange === "1000-2000") {
                    minPrice = 1000;
                    maxPrice = 2000;
                } else if (selectedPriceRange === "2000+") {
                    minPrice = 2000;
                    maxPrice = Infinity;
                }

                const selectedGender = typeof answers.question === "string" ? answers.question.toLowerCase() : null;

                const filteredProducts = data.filter(product => {
                    const productGender = product.gender
                        ? (Array.isArray(product.gender)
                            ? product.gender.map(g => g.toLowerCase())
                            : product.gender.toLowerCase())
                        : null;

                    const productPrice = Number(product.price) || 0;

                    return (!selectedGender || (productGender &&
                        (Array.isArray(productGender) ? productGender.includes(selectedGender) : productGender === selectedGender))) &&
                        (!answers.color || product.colors?.includes(answers.color)) &&
                        (productPrice >= minPrice && productPrice < maxPrice);
                });

                const answerElement = document.querySelector(".answer");
                if (answerElement) {
                    answerElement.remove();
                }

                const productListContainer = document.createElement("div");
                productListContainer.className = "container produtcList";  // Corrected class names
                productListContainer.innerHTML = `
                    <div id="productContainer" class="swiper swiper-initialized swiper-horizontal swiper-ios swiper-backface-hidden">
                        <div class="swiper-wrapper" aria-live="polite" style="transition-duration: 0ms; transform: translate3d(0px, 0px, 0px); transition-delay: 0ms;"></div>
                        <div class="swiper-pagination"></div>
                        <div class="swiper-button-next" tabindex="0" role="button" aria-label="Next slide"></div>
                        <div class="swiper-button-prev swiper-button-disabled" tabindex="-1" role="button" aria-label="Previous slide" aria-disabled="true"></div>
                        <span class="swiper-notification" aria-live="assertive" aria-atomic="true"></span>
                    </div>
                `;
                document.body.appendChild(productListContainer);

                const swiperWrapper = productListContainer.querySelector('.swiper-wrapper');

                if (filteredProducts.length === 0) {
                    const productContainer = document.querySelector('.container.produtcList');
                    productContainer.innerHTML = '';
                    productContainer.innerHTML = `
                        <div id="no-products-found">
                            <div>Aradığınız Kriterlerde Ürün Bulunamadı.</div>
                        </div>
                    `;
                    return;
                }

                filteredProducts.forEach((product, index) => {
                    const slideDiv = document.createElement('div');
                    slideDiv.className = `product swiper-slide${index === 0 ? ' swiper-slide-active' : index === 1 ? ' swiper-slide-next' : ''}`;
                    slideDiv.setAttribute('role', 'group');
                    slideDiv.setAttribute('aria-label', `${index + 1} / ${filteredProducts.length}`);
                    slideDiv.style.width = '493px';

                    slideDiv.innerHTML = `
                    <div class="products">
                     <img class="productImage" src="${product.image}" alt="${product.name}">
                    <h3 class="productTitle">${product.name}</h3>
                    ${product.oldPriceText ? `<p class="productOldPrice">${product.oldPriceText}</p>` : ""}
                    <p class="productPrice">${product.priceText}</p>
                    <button class="productViewButton"> VIEW PRODUCT </button>
                    </div>
                   
                `;

                    swiperWrapper.appendChild(slideDiv);
                });
                initializeSwiper();
            })
            .catch(error => {
                const productContainer = document.querySelector('.container.produtcList');
                productContainer.innerHTML = '';
                productContainer.innerHTML = `
                    <div id="no-products-found">
                        <div>Ürünleri yüklerken bir hata oluştu.</div>
                    </div>
                `;
            });
    }
}

function initializeSwiper() {
    if (swiper) {
        swiper.destroy();
    }

    const swiperContainer = document.querySelector('#productContainer');
    if (!swiperContainer) {
        console.error('Swiper container not found');
        return;
    }

    swiper = new Swiper(swiperContainer, {
        slidesPerView: 1,
        spaceBetween: 30,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            type: 'bullets'
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        showQuestion(currentStep);
    }
}

function updateButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!prevBtn || !nextBtn) return;

    prevBtn.disabled = currentStep === 0;

    const questionSet = questions.find(q => q.name === currentCategory);
    if (questionSet && questionSet.steps[currentStep]) {
        nextBtn.disabled = !answers[questionSet.steps[currentStep].type];
    } else {
        nextBtn.disabled = true;
    }
}

function renderSteps() {
    const stepsContainer = document.querySelector('.steps');
    stepsContainer.innerHTML = "";

    const questionSet = questions[0];
    for (let i = 0; i < questionSet.steps.length; i++) {
        const stepDiv = document.createElement('div');
        stepDiv.classList.add('step');
        if (i === 0) stepDiv.classList.add('active');
        stepsContainer.appendChild(stepDiv);
    }
}

function updateSteps() {
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        step.classList.toggle('active', index === currentStep);
    });
}

document.getElementById('nextBtn')?.addEventListener('click', nextStep);
document.getElementById('prevBtn')?.addEventListener('click', prevStep);