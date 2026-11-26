import {useEffect,useRef} from 'react';
import {flushSync} from 'react-dom';
import {createPageNavigation} from './motion-navigation.js';
export function useIOSNavigation(setView){
 const ref=useRef(null);
 if(!ref.current)ref.current=createPageNavigation({document,commit:next=>flushSync(()=>setView(next)),scroll:()=>window.scrollTo(0,0)});
 useEffect(()=>()=>ref.current.dispose(),[]);
 return ref.current;
}
