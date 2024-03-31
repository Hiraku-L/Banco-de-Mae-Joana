function showLoading() {
   const div = document.createElement('div');
   div.classList.add('loading',"centralize");
   const label = document.createElement('div');
   label.classList.add('loading_label',"active");
   label.innerHTML = "Um segundo Kaique...";
   document.body.appendChild(div);
   div.appendChild(label);
   
}
function hideLoading(){
const loading = document.getElementsByClassName('loading')
if (loading.length) {
    loading[0].remove();}
}