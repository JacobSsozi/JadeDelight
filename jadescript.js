document.addEventListener( 'DOMContentLoaded', function () {

 
    const makeElement = (docInstance, tagName, contents, attrs) => {
        const elem = docInstance.createElement(tagName);
        if (typeof contents === 'string') {
            elem.textContent = contents;
        } else {
            elem.append(...contents);
        }
        Object.keys(attrs || {}).forEach((k) => elem.setAttribute(k, attrs[k]));
        return elem;
    };


    const formatCost = (cost) => cost.toFixed(2).toString();


    const formatDate = (delayMinutes) => {

        const date = new Date();
        date.setMinutes( date.getMinutes() + delayMinutes );

        return date.toDateString() + ' at '
                + date.toTimeString().substring(0, 5);
    };


    const initializeCostField = (elem) => {
        elem.value = '0.00';
        elem.setAttribute('readonly', true);
        elem.setAttribute('tabindex', -1);
    };


    function MenuOption(tableRow) {
        const quantitySelector = tableRow.children[0].children[0];
        quantitySelector.addEventListener('input', this.onUpdate.bind(this));

        this.optionName = tableRow.children[1].textContent;

        this.costStr = tableRow.children[2].textContent;
        this.unitCost = parseFloat(this.costStr.substring(1));

        this.totalCostElem = tableRow.children[3].children[0];
        initializeCostField(this.totalCostElem);
        this.totalCostRaw = 0.00;
        this.quantity = 0;


        this.tableRow = tableRow;
    }
 
    MenuOption.prototype.onUpdate = function( event ) {
        this.quantity = event.target.value;
        this.totalCostRaw = this.quantity * this.unitCost;
        this.totalCostElem.value = formatCost(this.totalCostRaw);
        const updateEvent = new Event('update');
        this.tableRow.dispatchEvent(updateEvent);
    };

    MenuOption.prototype.getTotalCost = function () {
        return this.totalCostRaw;
    };

    MenuOption.prototype.makeConfirmationRow = function (doc) {
        return makeElement(
            doc, 'tr',
            [
                makeElement(doc, 'td', this.quantity.toString()),
                makeElement(doc, 'td', this.optionName),
                makeElement(doc, 'td', this.costStr),
                makeElement(doc, 'td', '$' + this.totalCostElem.value)
            ]
        );
    };

    const menuRowsNodeList = document.querySelectorAll('tr:not(:first-child)');
    const menuRows = Array.from(menuRowsNodeList);
    const menuOptions = menuRows.map(tr => new MenuOption(tr));

    const subtotal = document.getElementById('subtotal');
    const tax = document.getElementById('tax');
    const total = document.getElementById('total');
    [ subtotal, tax, total ].forEach(e => initializeCostField(e));

    const onOrderChange = () => {

        const subtotalPrice = menuOptions.reduce(
            (total, currOption) => total + currOption.getTotalCost(),
            0.00
        );
        subtotal.value = formatCost(subtotalPrice);
        const taxAmount = subtotalPrice * 0.0625;
        tax.value = formatCost(taxAmount);
        total.value = formatCost(subtotalPrice + taxAmount);
    };
    menuRows.forEach(e => e.addEventListener('update', onOrderChange));

    const [pickup, delivery] = document.querySelectorAll('input[name="p_or_d"]');

    let isPickup = pickup.checked;

    const [street, city] = document.querySelectorAll('.address');
    const onTypeChange = (wantPickup) => {
        isPickup = wantPickup;

        street.classList.toggle('hidden', wantPickup);
        city.classList.toggle('hidden', wantPickup);
    };
    pickup.addEventListener('input', () => onTypeChange(true));
    delivery.addEventListener('input', () => onTypeChange(false));

    onTypeChange(isPickup);

    const phoneField = document.querySelector('input[name="phone"]');
    const streetField = document.querySelector('input[name="street"]');
    const cityField = document.querySelector('input[name="city"]');
    const firstNameField = document.querySelector('input[name="fname"]');
    const lastNameField = document.querySelector('input[name="lname"]');

    const getCustomerName = () => {
        if (lastNameField.value === '') {
            return false;
        }
        let firstName = firstNameField.value;
        if (firstName != '') {

            firstName += ' ';
        }
        return (firstName + lastNameField.value);
    }
   
    const extractPhoneNumber = () => {
        const isDigit = (c) => c >= '0' && c <= '9';
        return phoneField.value.split('').filter(isDigit).join('');
    };
    const validators = [

        () => (total.value !== '0.00' ? true : 'No items ordered!'),
        () => {

            const numDigits = extractPhoneNumber().length;
            return ((numDigits === 7 || numDigits === 10)
                        ? true
                        : 'Phone numbers must have 7 or 10 digits!');
        },
        () => {
            if (isPickup) {
                return true;
            }
            return ((streetField.value !== '' && cityField.value !== '')
                    ? true
                    : 'Delivery requires a street and city!');
        },
        () => ((getCustomerName() !== false)
                    ? true
                    : 'Last name is required!'
        )
    ];
    const doValidate = () => {
        const errors = validators.map(v => v()).filter(r => r !== true);
        if (errors.length === 0) {
            return true;
        }
        if (errors.length === 1) {
            alert('Error: ' + errors[0]);
            return false;
        }
        alert('Errors:\n - ' + errors.join('\n - '));
        return false;
    };

    const getConfirmationHeadItems = (doc) => {
        const title = makeElement(
            doc, 'title', 'Jade Delight - Order Confirmation'
        );

        const currStyles = document.querySelector('link');
        const styleLink = makeElement(
            doc, 'link', [],
            { 'rel': 'stylesheet', 'type': 'text/css', 'href': currStyles.href }
        );
        return [title, styleLink];
    };

    const getCustomerDetails = (doc) => {
        let orderType = 'pickup';
        if (!isPickup) {
            orderType = 'delivery to ' + streetField.value + ', '
                            + cityField.value;
        }
        return makeElement(
            doc, 'div',
            [
                makeElement(doc, 'strong', 'Customer:'),
                makeElement(doc, 'p', 'Name: ' + getCustomerName()),
                makeElement(doc, 'p', 'Phone number: ' + extractPhoneNumber()),
                makeElement(doc, 'p', 'Order type: ' + orderType)
            ],
            { 'id': 'customer-details' }
        );
    };

    const getConfirmationOrderDetails = (doc) => {
        const headerRow = makeElement(
            doc, 'tr',
            ['Quantity', 'Item', 'Unit cost', 'Total cost']
                .map((text) => makeElement(doc, 'th', text))
        );
        const thead = makeElement(doc, 'thead', [headerRow]);

        const menuRows = menuOptions.map(mo => mo.makeConfirmationRow(doc));
        const tbody = makeElement(doc, 'tbody', menuRows);

        const makeSummary = (label, value, attrs) => makeElement(
            doc, 'tr',
            [
                makeElement(doc, 'td', label, { 'colspan': '3' }),
                makeElement(doc, 'td', '$' + value)
            ],
            attrs
        );
        tbody.append(
            makeSummary('Subtotal', subtotal.value, { 'id': 'subtotal-row' }),
            makeSummary('Massachusetts tax (6.25%)', tax.value),
            makeSummary('Total', total.value)
        );
        return makeElement(
            doc, 'div',
            [
                makeElement(doc, 'strong', 'Order:'),
                makeElement(doc, 'table', [thead, tbody])
            ],
            { 'id': 'order-details' }
        );
    };

    const getOrderTimeline = (doc) => {
        const delayMinutes = (isPickup ? 15 : 45);
        const action = isPickup ? 'ready for pickup' : 'delivered';
        const timeline = 'Your order will be ' + action + ' in the next '
            + delayMinutes.toString() + ' minutes, by '
            + formatDate(delayMinutes) + '.';

        return makeElement(
            doc, 'div',
            [
                makeElement(doc, 'strong', 'Timeline:'),
                makeElement(doc, 'p', timeline)
            ],
            { 'id': 'timeline-details' }
        );
    };

    const getConfirmationBodyItems = (doc) => {
        const heading = makeElement(
            doc, 'h1', 'Jade Delight Order Confirmation'
        );
        const bodyWrapper = makeElement(
            doc, 'div',
            [
                getCustomerDetails(doc),
                getConfirmationOrderDetails(doc),
                getOrderTimeline(doc)
            ],
            { 'id': 'body-content' }
        );
        return [heading, bodyWrapper];
    };

    const getSubmissionPopup = () => {
        const popupLabel = makeElement(
            document, 'strong', 'Order submitted!',
            { 'id': 'submission-popup-label' }
        );
        const popupText = makeElement(
            document, 'span', 'Press continue to view the confirmation.',
            { 'id': 'submission-popup-text'}
        );
        const popupContinue = makeElement(
            document, 'button', 'Continue', { 'id': 'submission-popup-continue'}
        );
        const popupContinueWrapper = makeElement(
            document, 'div', [popupContinue],
            { 'id': 'submission-popup-continue-wrapper'}
        );
        const hr = makeElement(document, 'hr', '');
        const popupDialog = makeElement(
            document, 'div',
            [ popupLabel, popupText, hr, popupContinueWrapper],
            { 'id': 'submission-popup-dialog' }
        );
        const popupWrapper = makeElement(
            document, 'div', [popupDialog], { 'id': 'submission-popup-wrapper' }
        );
        popupContinue.addEventListener('click', () => {
            const continueEvent = new Event('continue');
            popupWrapper.dispatchEvent(continueEvent);
        });
        return popupWrapper;
    }

    const launchConfirmationPage = () => {
        const windowRef = window.open('');
        const otherDoc = windowRef.document;
        const otherDocHead = otherDoc.querySelector('head');
        otherDocHead.append(...getConfirmationHeadItems(otherDoc));
        const otherDocBody = otherDoc.querySelector('body');
        otherDocBody.classList.add('confirmation-page');
        otherDocBody.append(...getConfirmationBodyItems(otherDoc));
    };

    const onSubmitSuccess = () => {
        const popup = getSubmissionPopup();
        document.querySelector('body').append(popup);
        popup.addEventListener( 'continue', () => {
            popup.remove();
            launchConfirmationPage();
        } )
    };


    const onFormSubmission = (e) => {
        e.preventDefault();
        if (doValidate()) {
            onSubmitSuccess();
        }
    };

    const form = document.querySelector('form');
    form.addEventListener('submit', onFormSubmission);
    const submitBtn = document.querySelector(
        'input[type="button"][value="Submit Order"]'
    );
    submitBtn.addEventListener('click', () => form.requestSubmit());
} );
