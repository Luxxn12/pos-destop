"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTimeHHMMSS = exports.formatDateTimeDDMMYYYY = exports.formatDateDDMMYYYY = void 0;
const pad = (value) => String(value).padStart(2, "0");
const formatParts = (year, month, day) => `${pad(day)}-${pad(month)}-${year}`;
const parseDateInput = (input) => {
    const raw = input.trim();
    if (!raw)
        return null;
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
    const dateTime = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;
    let match = raw.match(dateTime);
    if (match) {
        const [, year, month, day, hours, minutes, seconds] = match;
        return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)));
    }
    match = raw.match(dateOnly);
    if (match) {
        const [, year, month, day] = match;
        return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()))
        return null;
    return parsed;
};
const formatDateDDMMYYYY = (input) => {
    if (!input)
        return "-";
    if (input instanceof Date) {
        return formatParts(input.getFullYear(), input.getMonth() + 1, input.getDate());
    }
    const parsed = parseDateInput(input);
    if (!parsed)
        return input.trim();
    return formatParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
};
exports.formatDateDDMMYYYY = formatDateDDMMYYYY;
const formatDateTimeDDMMYYYY = (input) => {
    if (!input)
        return "-";
    if (input instanceof Date) {
        const date = (0, exports.formatDateDDMMYYYY)(input);
        const time = `${pad(input.getHours())}:${pad(input.getMinutes())}:${pad(input.getSeconds())}`;
        return `${date} ${time}`;
    }
    const parsed = parseDateInput(input);
    if (!parsed)
        return input.trim();
    const date = (0, exports.formatDateDDMMYYYY)(parsed);
    const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
    return `${date} ${time}`;
};
exports.formatDateTimeDDMMYYYY = formatDateTimeDDMMYYYY;
const formatTimeHHMMSS = (input) => {
    if (!input)
        return "-";
    const parsed = input instanceof Date ? input : parseDateInput(input);
    if (!parsed)
        return typeof input === "string" ? input.trim() : "-";
    return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
};
exports.formatTimeHHMMSS = formatTimeHHMMSS;
