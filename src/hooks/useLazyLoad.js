import { useState, useEffect, useRef } from "react";

const useLazyLoad = (customCallback) => {
    const endPageRef = useRef(null);
    const [ isIntersecting, setIsIntersecting ] = useState(false);
    const callbackRef = useRef(customCallback);

    useEffect(() => {
        callbackRef.current = customCallback;
    }, [customCallback]);

    useEffect(() => {
        const target = endPageRef.current;
        if (!target || typeof IntersectionObserver === "undefined") return undefined;

        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
            if (entry.isIntersecting && callbackRef.current) callbackRef.current();
        }, { rootMargin: "300px 0px" });
        observer.observe(target);

        return () => {
            observer.disconnect();
        }
    }, [])

    return [endPageRef, isIntersecting];
}

export default useLazyLoad;
