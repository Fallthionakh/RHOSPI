import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900})
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(600);await pg.evaluate("S.popPaieVu=true;closeModal();S.page='remun';S.rem.tab='rub';render()");await pg.wait_for_timeout(300)
        await pg.evaluate("[...document.querySelectorAll('#main h2')].find(h=>h.textContent.startsWith('2 ·')).scrollIntoView()");await pg.screenshot(path='/tmp/ui_grille.png')
        await b.close()
asyncio.run(main())
