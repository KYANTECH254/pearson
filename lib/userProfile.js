const optionalStringFields = [
  "countryOfResidence",
  "gender",
  "cityOfBirth",
  "countryOfBirth",
  "countryOfCitizenship",
  "streetAddress",
  "city",
  "phoneCountryCode",
  "primaryPhone",
  "parentalConsentForm",
  "deliveredBy",
  "avatarUrl",
];
const optionalBooleanFields = [
  "accommodationsNeeded",
  "smsConsent",
  "communicationConsent",
  "researchConsent",
  "inSimplifiedChinese",
  "noGivenNames",
  "noLastName",
];

function optionalProfileData(body) {
  const data = {};
  const source = {
    ...body,
    countryOfResidence: body.countryOfResidence ?? body.country,
    countryOfBirth: body.countryOfBirth ?? body.birthCountry,
    countryOfCitizenship: body.countryOfCitizenship ?? body.citizenship ?? body.nationality,
    streetAddress: body.streetAddress ?? body.address,
    phoneCountryCode: body.phoneCountryCode ?? body.countryCode ?? body.telephoneCountryCode,
    primaryPhone: body.primaryPhone ?? body.phone ?? body.telephone ?? body.mobile,
    dateOfBirth: body.dateOfBirth ?? body.dob,
    birthDay: body.birthDay ?? body.day,
    birthMonth: body.birthMonth ?? body.month,
    birthYear: body.birthYear ?? body.year,
  };

  optionalStringFields.forEach((field) => {
    if (source[field] !== undefined) {
      data[field] = String(source[field] || "").trim() || null;
    }
  });

  optionalBooleanFields.forEach((field) => {
    if (source[field] !== undefined) {
      data[field] = source[field] === true || source[field] === "true" || source[field] === "on" || source[field] === "1";
    }
  });

  ["birthDay", "birthMonth", "birthYear"].forEach((field) => {
    if (source[field] !== undefined) {
      if (source[field] === null || String(source[field]).trim() === "") {
        data[field] = null;
        return;
      }

      const value = Number(source[field]);
      data[field] = Number.isInteger(value) ? value : null;
    }
  });

  if (source.dateOfBirth) {
    const value = new Date(source.dateOfBirth);
    data.dateOfBirth = Number.isNaN(value.getTime()) ? null : value;
  } else if (data.birthDay && data.birthMonth && data.birthYear) {
    data.dateOfBirth = new Date(Date.UTC(data.birthYear, data.birthMonth - 1, data.birthDay));
  } else if (source.dateOfBirth !== undefined) {
    data.dateOfBirth = null;
  }

  return data;
}

module.exports = {
  optionalProfileData,
};
