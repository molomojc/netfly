export const getOneMonthAgoReleaseDate = () => {
    let date = new Date();
    date.setMonth(date.getMonth() - 1);
    let formattedDate = date.toJSON().slice(0,10);

    return formattedDate;
}

export const dateToYearOnly = date => date.slice(0,4);

export const capitalizeFirstLetter = text => (
    text.charAt(0).toUpperCase() + text.slice(1)
);

export const randomize = data => (
    Math.floor(Math.random() * data.length - 1)
);

export const truncate = (text, n) => (
    text?.length > n ? text.substr(0, n - 1) + "..." : text
);

// Rough TV detection: used to skip GPU-expensive effects that desktop browsers
// can afford. Covers Android TV, Fire TV, Bravia, LG webOS, Tizen and Roku.
export const isTvDevice = () => {
    if (typeof navigator === "undefined") return false;
    return /Android TV|Android.*TV|AFT[A-Z0-9]|Fire TV|BRAVIA|GoogleTV|SmartTV|Web0S|Tizen|Roku/i.test(
        navigator.userAgent
    );
};
