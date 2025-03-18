const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/scrape', async (req, res) => {
    try {
        console.log('🚀 Lancement du navigateur...');
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        const url = 'https://www.douane.gov.ma/adil/Tarif_pdf.asp';
        console.log(`➡️ Navigation vers ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Pause pour permettre le chargement complet de la page
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
        
        // Vérifier que les sections sont présentes
        const sectionExists = await page.$("td[style='background-color: #FFFFCC']");
        if (!sectionExists) {
            throw new Error("⚠️ Les sections ne sont pas trouvées, vérifie si le site a changé.");
        }
        console.log('🔍 Extraction des sections et chapitres...');
        
        const sectionsData = await page.evaluate(() => {
            const data = {};
            let currentSection = '';
            
            document.querySelectorAll('tr').forEach(row => {
                const sectionCell = row.querySelector("td[style='background-color: #FFFFCC']");
                if (sectionCell) {
                    currentSection = sectionCell.innerText.trim();
                    if (currentSection) data[currentSection] = [];
                }
                
                const chapitreElements = row.querySelectorAll("td[width='75%'] a");
                chapitreElements.forEach(link => {
                    const chapitreName = link.innerText.trim();
                    const chapitreUrl = link.href;
                    if (currentSection && chapitreName && chapitreUrl) {
                        data[currentSection].push({ name: chapitreName, url: chapitreUrl });
                    }
                });
            });
            return data;
        });

        console.log('✅ Extraction terminée !');
        
        // Sauvegarde des données en JSON
        fs.writeFileSync('sections_chapitres.json', JSON.stringify(sectionsData, null, 4), 'utf-8');
        console.log('📂 Données stockées dans sections_chapitres.json');

        await browser.close();
        console.log('🛑 Navigateur fermé.');

        res.json({ success: true, data: sectionsData });
    } catch (error) {
        console.error('❌ Erreur lors du scraping :', error);
        res.status(500).json({ success: false, message: 'Erreur lors du scraping', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
});
