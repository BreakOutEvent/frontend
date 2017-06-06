'use strict';
const $ = require('jquery');

var toggleLoading = require('./helpers').toggleLoading;

$(document).ready(() => {

  var $_GET = {};

  document.location.search.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function () {
    function decode(s) {
      return decodeURIComponent(s.split('+').join(' '));
    }
    $_GET[decode(arguments[1])] = decode(arguments[2]);
  });
  if($_GET['direction'] === 'up'){
    $('input.swap').attr('value', 'down');
  }
  else{
    $('input.swap').attr('value', 'up');
  }


  $('.moreinfo').hide();
  $('.member').css('cursor','pointer');
  $('.member').click(function(){
    $(this).siblings('.moreinfo').toggle();
  });

  $('.btn-payment').click(function () {

    toggleLoading(this, true);
    var button = this;

    $.post('/admin/payment/add', {
      team: $(this).attr('data-team'),
      amount: $(this).attr('data-amount'),
      invoice: $(this).attr('data-invoice')
    }).success(function () {
      $('#results')
        .append('<div class="alert alert-success alert-dismissable">' +
          '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
          'Erfolgreich ' + $(button).attr('data-amount') + '€ zu Team ' +
          $(button).attr('data-team') + ' hinzugefügt </div>');
    }).error(function (err) {
      console.log(err);
      $('#results')
        .append('<div class="alert alert-danger alert-dismissable">' +
          '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
          'Eintragen von ' + $(button).attr('data-amount') + '€ zu Team ' +
          $(button).attr('data-team') + ' fehlgeschlagen: ' +
          err.responseJSON.message + ' </div>');
    }).always(() => {
      toggleLoading(this);
    });
  });


  $('.btn-sponsor-payment').submit(handleInvoicePaymentSubmit);

  function handleInvoicePaymentSubmit(e) {
    e.preventDefault();
    const amount = $(this).serializeArray()
      .filter(elem => elem.name === 'add-to-invoice-amount')[0].value;

    const invoiceId = parseInt($(this).attr('data-invoice'));

    addPaymentToInvoice(invoiceId, amount,
      () => onAddPaymentToInvoiceSuccess(invoiceId, amount),
      onAddPaymentToInvoiceError);

  }

  function onAddPaymentToInvoiceSuccess(invoiceId, amount) {
    displaySuccess(`Added ${amount} to invoice ${invoiceId}`);
  }

  function onAddPaymentToInvoiceError(e) {
    displayError(`Error adding payment to invoice. Reason: ${e.responseText}`);
  }

  function addPaymentToInvoice(invoiceId, amount, onSuccess, onError) {
    $.post('/admin/payment/add', {
      amount: amount,
      invoice: invoiceId
    }).success(onSuccess).error(onError);
  }

  $('.btn-checkin').click(function () {

    toggleLoading(this, true);
    var button = this;

    $.post('/admin/team/checkin', {
      team: $(this).attr('data-team'),
      event: $(this).attr('data-event')
    }).success(function () {
      $('#results')
        .append('<div class="alert alert-success alert-dismissable">' +
          '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
          'Team ' + $(button).attr('data-team') + ' erfolgreich eingecheckt</div>');
    }).error(function (err) {
      console.log(err);
      $('#results')
        .append('<div class="alert alert-danger alert-dismissable">' +
          '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
          'Eintragen von Team ' + $(button).attr('data-team') + ' fehlgeschlagen: ' +
          err.responseJSON.message + ' </div>');
    }).always(() => {
      toggleLoading(this);
    });
  });

  $('.btn-addamount').click(function () {

    toggleLoading(this, true);
    var button = this;
    var invoiceId = $(this).attr('data-invoice');

    $.post('/admin/invoice/amount/add', {
      invoiceId: invoiceId,
      amount: $('#amount-' + invoiceId).val()
    }).success(function () {
      $('#results')
        .append('<div class="alert alert-success alert-dismissable">' +
          '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
          'Erfolgreich ' + $('#amount-' + invoiceId).val() + '€ zu Invoice ' +
          invoiceId + ' hinzugefügt </div>');
    }).error(function (err) {
      console.log(err);
      $('#results')
        .append('<div class="alert alert-danger alert-dismissable">' +
          '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
          'Eintragen von ' + $('#amount-' + invoiceId).val() + '€ zu Invoice ' +
          invoiceId + ' fehlgeschlagen: ' +
          err.responseJSON + ' </div>');
    }).always(() => {
      toggleLoading(this);
    });
  });

  $('[type=search]').on('input', function (e) {

    var val = $(this).val().toLowerCase();

    if (val.length < 1) {
      $('#list tr').show();
    } else {
      $('#list tr').each(function (i, e) {
        if ($(e).html().toLowerCase().indexOf(val) > -1) {
          $(e).show();
        } else {
          $(e).hide();
        }
      });
    }
  });

  const buttonAddNewPayment = $('#btn-addNewPayment');

  buttonAddNewPayment.click(() => {

    const data = {
      teamId: $('#teamId').val(),
      firstname: $('#firstname').val(),
      lastname: $('#lastname').val(),
      company: $('#company').val(),
      amount: $('#amount').val()
    };

    toggleLoading(buttonAddNewPayment);

    $.post('/admin/invoice/add', data)
      .success((response) => {
        const invoiceId = response.id;
        $.post('/admin/invoice/amount/add', {
          invoiceId: invoiceId,
          amount: data.amount
        }).success(() => {
          const message = `Rechnung mit ID ${invoiceId} erfolgreich erstellt und eine Zahlung von ${data.amount}€ hinzugefügt`;
          displaySuccess(message);
        }).error((err) => {
          const message = `Fehler beim hinzufügen einer Zahlung zur Rechnung mit ID ${invoiceId}: ${err.message}`;
          displayError(message);
        });
      })
      .error((err) => {
        displayError('Fehler beim Erstellen einer neuen Rechnung');
      })
      .always(() => toggleLoading(buttonAddNewPayment));
  });
});

function displaySuccess(message) {
  $('#results')
    .append('<div class="alert alert-success alert-dismissable">' +
      '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a> ' + message + ' </div>');
}

function displayError(message) {
  $('#results')
    .append('<div class="alert alert-danger alert-dismissable">' +
      '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a> ' + message + ' </div>');
}
