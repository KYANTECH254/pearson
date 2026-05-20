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
      const value = Number(source[field]);
      data[field] = Number.isInteger(value) ? value : null;
    }
  });

  if (source.dateOfBirth) {
    const value = new Date(source.dateOfBirth);
    data.dateOfBirth = Number.isNaN(value.getTime()) ? null : value;
  }

  return data;
}

module.exports = {
  optionalProfileData,
};
