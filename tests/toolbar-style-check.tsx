import { createRoot } from 'react-dom/client'
import { Tldraw, createShapeId, toRichText, type Editor, b64Vecs } from 'tldraw'
import 'tldraw/tldraw.css'
import '../src/index.css'
import { projectShapeUtils } from '../src/lib/project-image-shape'
import { getShapeFontSize, setSelectionFontSize, setSelectionStrokeWidth, setSelectionColor } from '../src/lib/project-shape-colors'
async function verify(editor: Editor) {
 const logs: string[]=[]
 const check=(v:unknown,s:string)=>{if(!v)throw Error(s);logs.push('PASS '+s)}
 try {
 const a=createShapeId(), b=createShapeId(), pen=createShapeId(), highlight=createShapeId()
 editor.createShapes([{id:a,type:'text',props:{richText:toRichText('Hello world'),font:'sans'}},{id:b,type:'text',y:150,props:{richText:toRichText('Hello world long wrapped text'),font:'sans',autoSize:false,w:120,scale:2}}, {id:pen,type:'draw',props:{isComplete:true,segments:[{type:'free',path:b64Vecs.encodePoints([{x:0,y:0,z:0.5},{x:100,y:50,z:0.5}])}]}}, {id:highlight,type:'highlight',props:{isComplete:true,segments:[{type:'free',path:b64Vecs.encodePoints([{x:0,y:0,z:0.5},{x:100,y:50,z:0.5}])}]}}])
 await editor.getSvgString([a,b])
 const before=editor.getShapeGeometry(a).bounds.clone()
 editor.select(a,b);editor.markHistoryStoppingPoint('font size');setSelectionFontSize(editor,48)
 check([a,b].every(id=>{const s=editor.getShape(id)!;return s.type==='text'&&getShapeFontSize(editor,s)===48}),'字号与缩放元素同步为整数 48')
 check(editor.getShapeGeometry(a).bounds.width>before.width,'字号变化更新文字选区')
 const height=editor.getShapeGeometry(b).bounds.height
 setSelectionFontSize(editor,72)
 check(editor.getShapeGeometry(b).bounds.height>height,'固定宽度文字重新换行')
 const svg=await editor.getSvgString([a,b]);check(svg?.svg.includes('72px')&&!svg.svg.includes('NaN'),'SVG 使用实际字号')
 editor.undo();check(!editor.getShape(a)!.meta.editorFontSize && editor.getShapeGeometry(a).bounds.width===before.width,'撤销恢复文字几何')
 editor.redo();check(editor.getShapeGeometry(a).bounds.width>before.width,'重做恢复文字几何')
 editor.select(pen,highlight);setSelectionStrokeWidth(editor,12);setSelectionColor(editor,'stroke','#ff0000')
 const strokes=await editor.getSvgString([pen,highlight]);check(strokes?.svg.includes('#ff0000')&&!strokes.svg.includes('NaN'),'画笔与荧光笔颜色和粗细可导出')
 const snapshot=editor.getSnapshot();editor.loadSnapshot(snapshot)
 const restored=editor.getShape(a)!;check(restored.type==='text'&&getShapeFontSize(editor,restored)===72,'快照恢复字号')
 }catch(e){logs.push('FAIL '+e)}
 document.getElementById('results')!.textContent=logs.join('\n')
}
createRoot(document.getElementById('root')!).render(<Tldraw shapeUtils={projectShapeUtils} hideUi onMount={editor=>{requestAnimationFrame(()=>void verify(editor))}} />)
