window.FateOpening = (function(){
const story = [
      { bg: 'cottage', left: 'hero', right: 'master', speaker: '师尊', text: '来了？' },
      { bg: 'cottage', left: 'hero', right: 'master', speaker: '鸿明', text: '师尊唤弟子前来，不知所为何事？' },
      { bg: 'cottage', left: 'hero', right: 'master', speaker: '师尊', text: '今日你晋升宗师，山下都在替你贺喜。可为师只想问你一句，这些年在青崖峰，住得可习惯？' },
      { bg: 'cottage', left: 'hero', right: 'master', speaker: '鸿明', text: '弟子自小在此长大，一草一木皆是故旧，谈不上不习惯。' },
      { bg: 'cottage', left: 'hero', right: 'master', speaker: '师尊', text: '自小？你来此之前，可还记得另一处天地？', askName: true },
      { bg: 'cottage', left: 'hero', right: 'master', speaker: '师尊', text: '不必惊慌。大千阎浮，万界相通。穿越之事少见，却不稀奇。' },
      { bg: 'cottage', left: 'hero', right: 'master', speaker: '师尊', text: '你如今是宗师，在青木界算得上后生可畏。可放在阎浮里，也只是十都级别的入门实力。' },
      { bg: 'cottage', left: 'hero', right: 'master', speaker: '师尊', text: '为师今日告诉你这些，是因为……' },
      { bg: 'attack', left: 'hero', right: 'master', speaker: '旁白', text: '天外黑雾压下，草庐上空的云海被撕开一道漆黑裂缝。', sfx: 'thunder' },
      { bg: 'attack', left: 'hero', right: 'master', speaker: '师尊', text: '来得好快。' },
      { bg: 'attack', left: 'master', right: 'villain', speaker: '黑袍首领', text: '青云真人，六司之境，守在这小小青木界几十年，只为一道金鹏传承，值得么？' },
      { bg: 'attack', left: 'master', right: 'villain', speaker: '师尊', text: '值不值得，轮不到你说。' },
      { bg: 'attack', left: 'master', right: 'villain', speaker: '黑袍首领', text: '我只好奇，你到底在等什么？' },
      { bg: 'attack', left: 'master', right: 'hero', speaker: '师尊', text: '现在，我也想知道。' },
      { bg: 'attack', left: 'master', right: 'hero', speaker: '旁白', text: '一道金光没入你的胸膛，像有一只巨鸟在骨血深处睁开眼。' },
      { bg: 'attack', left: 'master', right: 'hero', speaker: '师尊', text: '走。带青棠走。别回头。' },
      { bg: 'attack', left: 'hero', right: 'qingtang', speaker: '青棠', text: '师兄！你去哪了？天上那个黑影是谁？我爹呢？' },
      { bg: 'attack', left: 'hero', right: 'qingtang', speaker: '主角', text: '我也不清楚。但现在不能留在这里。' },
      { bg: 'attack', left: 'hero', right: 'qingtang', speaker: '青棠', text: '那我们去哪？' },
      { bg: 'attack', left: 'hero', right: 'qingtang', speaker: '主角', text: '后山。先活下来。' },
      { bg: 'attack', left: 'hero', right: 'qingtang', speaker: '青棠', text: '嗯，我跟着你。', goMap: true }
    ];
const roles = {
      hero: '<div class="portrait p-hero" data-label="主角"></div>',
      qingtang: '<div class="portrait p-qingtang" data-label="青棠"></div>',
      master: '<div class="portrait p-master" data-label="师尊"></div>',
      merchant: '<div class="portrait p-merchant" data-label="苏锦书"></div>',
      villain: '<div class="portrait p-villain" data-label="黑袍"></div>'
    };
return { story, roles };
})();
