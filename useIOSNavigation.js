import {useLayoutEffect,useRef} from 'react';
import {flushSync} from 'react-dom';
import {createPageNavigation} from './motion-navigation.js';
export function useIOSNavigation(setView){
 const ref=useRef(null);
 if(!ref.current)ref.current=createPageNavigation({document,commit:next=>flushSync(()=>setView(next)),scroll:()=>window.scrollTo(0,0)});
 // A PIN lock must remove any captured page before the locked screen paints.
 useLayoutEffect(()=>()=>ref.current.dispose(),[]);
 return ref.current;
}
