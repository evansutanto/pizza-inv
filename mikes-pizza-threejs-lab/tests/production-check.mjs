/** Production/root/subpath smoke check. Run with preview servers already running.
 * node tests/production-check.mjs http://127.0.0.1:4174/ http://127.0.0.1:4175/mikes-pizza-threejs-lab/
 * Software WebGL readings verify instrumentation, not physical-phone performance.
 */
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const urls=process.argv.slice(2);
if(!urls.length)throw new Error('Supply one or more running production Preview URLs.');
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  for(const [index,url] of urls.entries()){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'||(message.type()==='warning'&&message.text().includes('THREE.')))errors.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
    await page.goto(`${url}?perf=1&quality=balanced`);
    const phase=async expected=>await page.waitForFunction(value=>document.body.dataset.phase===value,expected);
    const read=async()=>await page.evaluate(()=>window.__PIZZA_LAB__.report());
    await phase('exterior');await page.waitForTimeout(8200);const exterior=await read();
    await page.getByRole('button',{name:'Close benchmark panel'}).click();
    await page.getByRole('button',{name:/tap to enter/i}).click();await phase('kitchen');
    await page.getByRole('button',{name:'Place the dough',exact:true}).click();
    for(let i=0;i<3;i++)await page.getByRole('button',{name:'Flatten dough',exact:true}).click();
    await page.getByRole('button',{name:'Add tomato sauce',exact:true}).click();
    await page.getByRole('button',{name:'Add cheese',exact:true}).click();
    await page.getByRole('button',{name:'Toggle performance benchmark panel'}).click();
    await page.waitForTimeout(8200);const kitchen=await read();
    await page.getByRole('button',{name:'Close benchmark panel'}).click();
    await page.getByRole('button',{name:/click to bake/i}).click();await phase('invitation');
    assert.equal(await page.evaluate(()=>window.__PIZZA_LAB__.invitation.pizzaStarted),false);
    await page.waitForFunction(()=>window.__PIZZA_LAB__.invitation.pizzaSettled);
    await page.getByRole('button',{name:'Toggle performance benchmark panel'}).click();
    await page.waitForTimeout(8200);const invitation=await read();
    await page.getByRole('button',{name:'Close benchmark panel'}).click();
    await page.screenshot({path:`artifacts/production-invitation-${index+1}.png`});
    assert.deepEqual(errors,[]);
    assert.ok(invitation.current.drawCalls>0);
    const report={environment:'Automated Chromium software WebGL, 390×844 viewport / DPR2. Not a phone GPU measurement.',url,exterior,kitchen,invitation};
    await writeFile(`artifacts/production-benchmark-${index+1}.json`,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({url,result:'passed',startupMs:exterior.current.firstInteractiveFrameMs,scenes:[exterior.current,kitchen.current,invitation.current].map(v=>({scene:v.scene,averageFps:v.averageFps,p95FrameMs:v.p95FrameMs,drawCalls:v.drawCalls,triangles:v.triangles}))}));
    await context.close();
    // Static invitation remains useful if scripting or the entry bundle is unavailable.
    const noScript=await browser.newContext({javaScriptEnabled:false});const staticPage=await noScript.newPage();await staticPage.goto(url);
    assert.match(await staticPage.locator('main').innerText(),/Saturday, 5 December 2026/);
    assert.match(await staticPage.locator('main').innerText(),/18:00/);await noScript.close();
  }
}finally{await browser.close();}
