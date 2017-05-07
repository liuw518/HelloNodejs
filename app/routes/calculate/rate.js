var express = require('express');
var router = express.Router();
var utils = require('../../utils');

/* 建议书算费接口 */
router.post('/', function(req, res, next) {
  utils.doPost(req, res, next, {
    convertInput: function(input, output) {
      output.applicant = {};
      output.apply_date = input.apply_date;
      output.insureds = [];
      output.serialNo = input.serial_no;

      if (input.applicant) {
        output.applicant.age = input.applicant.age;
        output.applicant.birthday = input.applicant.birthday;
        output.applicant.sex = input.applicant.sex;
      }
      var insurdInfo = {},
        risksInfo = {};
      if (input.insureds) {
        insurdInfo.age = input.insureds[0].age;
        insurdInfo.birthday = input.insureds[0].birthday;
        insurdInfo.index = input.insureds[0].index;
        insurdInfo.risks = [];
        insurdInfo.sex = input.insureds[0].sex;
        if (input.insureds[0].risks[0]) {
          risksInfo.amountInsured = input.insureds[0].risks[0].amount_insured;
          risksInfo.initialPremium = input.insureds[0].risks[0].initial_premium;
          risksInfo.insurePeriodUnit = input.insureds[0].risks[0].insure_period_unit;
          risksInfo.insurePeriodValue = input.insureds[0].risks[0].insure_period_value;
          risksInfo.isSelected = input.insureds[0].risks[0].is_selected_fjx;
          risksInfo.mainRiskCode = input.insureds[0].risks[0].main_risk_code;
          risksInfo.paymentPeriodUnit = input.insureds[0].risks[0].payment_period_unit;
          risksInfo.paymentPeriodValue = input.insureds[0].risks[0].payment_period_value;
          risksInfo.paymentSchedule = '12';
          risksInfo.mult = '1';
          risksInfo.riskCode = input.insureds[0].risks[0].risk_code;
          //档次 从前端传过来
          risksInfo.level = '1';
        }
      }
      output.insureds[0] = insurdInfo;
      output.insureds[0].risks[0] = risksInfo;
    },

    convertOutput: function(inputRes, outputRes) {
      outputRes.rule_errors = [];
      outputRes.print_no = '';
      outputRes.third_transaction_no = '';
      outputRes.result_code = inputRes.resultCode;
      outputRes.result_message = inputRes.resultMessage;
      outputRes.insureds = [];
      var insuredsInfo = {},
        riskInfo = {};
      if (inputRes.insureds) {
        insuredsInfo.index = inputRes.insureds[0].index;
        insuredsInfo.risks = [];
        if (inputRes.insureds[0].risks) {
          var riskTemp = inputRes.insureds[0].risks[0];
          riskInfo.main_risk_code = riskTemp.mainRiskCode;
          riskInfo.is_insure_whole_life = riskTemp.isInsureWholeLife;
          riskInfo.payment_schedule = riskTemp.paymentSchedule;
          riskInfo.is_payment_whole_life = riskTemp.isPaymentWholeLife;
          riskInfo.risk_code = riskTemp.riskCode;
          riskInfo.insure_period_value = riskTemp.insurePeriodValue;
          riskInfo.insure_period_unit = riskTemp.insurePeriodUnit;
          riskInfo.payment_period_value = riskTemp.paymentPeriodValue;
          riskInfo.payment_period_unit = riskTemp.paymentPeriodUnit;
          riskInfo.amount_insured = riskTemp.amountInsured;
          riskInfo.initial_premium = riskTemp.initialPremium;
        }
      }
      outputRes.insureds[0] = insuredsInfo;
      outputRes.insureds[0].risks[0] = riskInfo;
    },

    buildError: function(obj, errorCode, errorMsg, detail) {
      obj.result_code = errorCode;
      obj.result_message = errorMsg;
    }

  });
});

module.exports = router;